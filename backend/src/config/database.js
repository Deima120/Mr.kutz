/**
 * Configuración de base de datos con Prisma
 * Soporta Neon (DATABASE_URL) y PostgreSQL local.
 * Reintentos: Neon en pausa o red inestable a veces falla la primera vez.
 */

import prisma from '../lib/prisma.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const connectDatabase = async () => {
  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 5);
  const baseDelayMs = Number(process.env.DB_CONNECT_RETRY_MS || 2500);

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      if (attempt > 1) {
        console.log(`✅ Base de datos conectada (intento ${attempt}/${maxAttempts})`);
      } else {
        console.log('✅ Base de datos conectada');
      }
      return;
    } catch (error) {
      lastError = error;
      const msg = error?.message || String(error);
      console.error(`❌ Conexión BD intento ${attempt}/${maxAttempts}:`, msg);
      if (attempt < maxAttempts) {
        const wait = baseDelayMs * attempt;
        console.log(`   Reintentando en ${wait / 1000}s… (Neon suele tardar unos segundos al despertar)`);
        await sleep(wait);
      }
    }
  }

  console.error('❌ Error de conexión a la base de datos:', lastError?.message || lastError);
  throw lastError;
};

export default prisma;
