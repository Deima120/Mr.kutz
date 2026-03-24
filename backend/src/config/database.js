/**
 * Configuración de base de datos con Prisma
 * Soporta Neon (DATABASE_URL) y PostgreSQL local
 */

import prisma from '../lib/prisma.js';

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Base de datos conectada');
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error?.message || error);
    throw error;
  }
};

export default prisma;
