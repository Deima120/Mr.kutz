/**
 * MR. KUTZ - Sistema de Gestión de Barbería
 * Punto de entrada principal del servidor API
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDatabase } from './config/database.js';
import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ========== MIDDLEWARES GLOBALES ==========
// Orígenes permitidos (frontend web + app Flutter)
const allowedOrigins = [
  'http://localhost:5173',  // Frontend React (Vite)
  'http://localhost:3000',  // Alternativo
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// En desarrollo, permitir cualquier localhost para Flutter
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin origin (móvil, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Permitir cualquier localhost en desarrollo
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Verificar lista de permitidos
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== RUTAS API ==========
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== MANEJO DE ERRORES ==========
app.use(errorHandler);

// ========== INICIAR SERVIDOR ==========
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📋 API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error?.message || error);
    process.exit(1);
  }
};

startServer();
