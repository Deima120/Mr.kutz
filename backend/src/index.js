/**
 * MR. KUTZ - Sistema de Gestión de Barbería
 * Punto de entrada principal del servidor API
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import prisma from './lib/prisma.js';

import { connectDatabase } from './config/database.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { getMailConfigDiagnostics } from './lib/mailer.js';
import { resolveJwtSecret } from './config/jwtSecret.js';
import { createOriginChecker } from './config/corsOrigin.js';
import routes from './routes/index.js';
import {
  startAppointmentStatusCron,
  stopAppointmentStatusCron,
} from './jobs/appointmentStatusJob.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// El secreto se valida SIEMPRE, no solo en producción: antes esta comprobación
// dependía de NODE_ENV y los puntos de uso caían a un fallback conocido si faltaba.
try {
  resolveJwtSecret();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Render (y cualquier PaaS) sirve detrás de un proxy. Sin esto req.ip es la IP del
// balanceador y TODOS los usuarios comparten la misma cubeta de rate limiting.
// Se usa el número 1 (un salto de confianza), nunca `true`, que aceptaría cualquier
// X-Forwarded-For falsificado por el cliente.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ========== MIDDLEWARES GLOBALES ==========
// Orígenes de desarrollo. En producción la lista queda VACÍA: si no, estos puertos
// se colarían por la comparación exacta, saltándose el guard de entorno.
const allowedOrigins = IS_PRODUCTION
  ? []
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

/**
 * Producción: FRONTEND_URL (y opcionalmente PUBLIC_FRONTEND_URL) pueden listar
 * varios orígenes separados por coma.
 *   FRONTEND_URL=https://app.tudominio.com,https://www.tudominio.com
 */
const envOrigins = [
  ...String(process.env.FRONTEND_URL || '').split(','),
  ...String(process.env.PUBLIC_FRONTEND_URL || '').split(','),
]
  .map((s) => s.trim())
  .filter(Boolean);

/** Permite previews de Vercel/Netlify si se quiere (CORS_ALLOW_PREVIEWS=true). */
const allowPreviews =
  String(process.env.CORS_ALLOW_PREVIEWS || '').toLowerCase() === 'true';

const isOriginAllowed = createOriginChecker({
  allowedOrigins,
  envOrigins,
  allowPreviews,
  isProduction: IS_PRODUCTION,
});

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn('[cors] origen rechazado:', origin);
    callback(new Error('No permitido por CORS.'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(morgan('dev'));
app.use(cors(corsOptions));
// Límite explícito para no depender del default de body-parser.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ========== RUTAS API ==========
app.use('/api', routes);

// Health check — Render lo usa (healthCheckPath) para decidir si un deploy está sano.
// Debe tocar la base: si solo respondiera 200 estático, promovería deploys con la BD
// caída o con el esquema desincronizado.
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[health] base de datos inaccesible:', error?.message || error);
    res.status(503).json({
      status: 'error',
      database: 'down',
      timestamp: new Date().toISOString(),
    });
  }
});

// ========== 404 (después de todas las rutas) ==========
app.use(notFound);

// ========== MANEJO DE ERRORES ==========
app.use(errorHandler);

// ========== GRACEFUL SHUTDOWN ==========
/** Referencia al servidor HTTP, necesaria para dejar terminar lo que está en vuelo. */
let httpServer = null;
let shuttingDown = false;

/** Margen para que terminen las peticiones en curso antes de forzar la salida. */
const SHUTDOWN_TIMEOUT_MS = 15000;

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} recibida. Cerrando servidor...`);

  // Red de seguridad: si algo se queda colgado, salir igualmente.
  const forceExit = setTimeout(() => {
    console.error('Cierre forzado: se agotó el tiempo de espera.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    stopAppointmentStatusCron();

    // Dejar de aceptar conexiones nuevas y esperar a las abiertas. Sin esto,
    // el SIGTERM de cada deploy de Render cortaba cobros a mitad de transacción.
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    await prisma.$disconnect();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    console.error('Error durante el cierre:', error?.message || error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// En Node ≥15 una promesa rechazada sin capturar TUMBA el proceso. Hay envíos de
// correo fire-and-forget (appointment.service.js), así que un fallo del proveedor
// bastaba para tirar la API. Se registra y se sigue.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.stack : reason);
});

// Una excepción no capturada sí deja el proceso en estado dudoso: cerrar ordenado.
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error?.stack || error);
  gracefulShutdown('uncaughtException');
});

// ========== INICIAR SERVIDOR ==========
const startServer = async () => {
  try {
    await connectDatabase();

    if (process.env.NODE_ENV === 'production') {
      const mailDiag = getMailConfigDiagnostics();
      if (mailDiag.warnings.length > 0) {
        console.warn('[mailer] Revisa configuración de correo en producción:');
        mailDiag.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
      } else if (mailDiag.productionReady) {
        console.log('✅ Correo transaccional listo para producción');
      }
    }

    httpServer = app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`📋 API: http://localhost:${PORT}/api`);
      startAppointmentStatusCron();
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error?.message || error);
    process.exit(1);
  }
};

startServer();
