/**
 * Configuración de base de datos con Prisma
 * Soporta Neon (DATABASE_URL) y PostgreSQL local
 */

import prisma from '../lib/prisma.js';

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error?.message || error);
    throw error;
  }
};

export default prisma;
