/**
 * Respaldo completo de la base de datos a un archivo JSON.
 *
 * Vuelca TODAS las tablas del esquema a `private/backups/backup-<timestamp>.json`
 * (fuera del control de versiones: `/private` está en .gitignore).
 *
 * Pensado como red de seguridad antes de operaciones destructivas
 * (ver scripts/wipe-database.mjs).
 *
 * Uso: npm run db:backup
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, '../../private/backups');

/** Orden de volcado: no importa para exportar, pero se mantiene legible por dominio. */
const MODELS = [
  'role',
  'user',
  'client',
  'barber',
  'barberSchedule',
  'serviceCategory',
  'service',
  'appointment',
  'paymentMethod',
  'payment',
  'paymentLine',
  'paymentMethodSplit',
  'commissionEntry',
  'cashRegister',
  'expenseCategory',
  'expense',
  'otherIncome',
  'productCategory',
  'product',
  'inventory',
  'inventoryMovement',
  'supplier',
  'purchase',
  'purchaseItem',
  'goodsReceipt',
  'goodsReceiptItem',
  'businessSetting',
  'documentSequence',
  'testimonial',
];

/** Decimal y BigInt no son serializables a JSON de forma nativa. */
function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return value.toString();
  if (value && typeof value === 'object' && typeof value.toFixed === 'function') {
    return value.toString();
  }
  return value;
}

async function main() {
  const prisma = new PrismaClient();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = join(BACKUP_DIR, `backup-${stamp}.json`);

  const dump = { meta: { createdAt: new Date().toISOString(), tables: {} }, data: {} };

  try {
    console.log('📦 Exportando base de datos...\n');

    for (const model of MODELS) {
      if (!prisma[model]) {
        console.warn(`  ⚠ modelo desconocido, se omite: ${model}`);
        continue;
      }
      const rows = await prisma[model].findMany();
      dump.data[model] = rows;
      dump.meta.tables[model] = rows.length;
      console.log(`  ✓ ${model.padEnd(22)} ${rows.length}`);
    }

    mkdirSync(BACKUP_DIR, { recursive: true });
    writeFileSync(outFile, JSON.stringify(dump, jsonReplacer, 2), 'utf8');

    const total = Object.values(dump.meta.tables).reduce((a, b) => a + b, 0);
    console.log(`\n✅ Respaldo completo: ${total} registros en ${MODELS.length} tablas`);
    console.log(`📄 ${outFile}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Falló el respaldo:', err?.message || err);
  process.exit(1);
});
