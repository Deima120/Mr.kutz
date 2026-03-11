/**
 * Cliente Prisma - Singleton para conexión a base de datos
 * Soporta Neon (DATABASE_URL) y PostgreSQL local
 */

import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
