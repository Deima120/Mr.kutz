/**
 * Cliente Prisma — un solo PrismaClient por proceso Node.
 * Debe reutilizarse en globalThis siempre: si no, cada hot-reload (dev) o import duplicado
 * abre más conexiones y agota el pool (p. ej. Neon, límite ~17).
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export default prisma;
