/**
 * Gate schema: cash_registers + Payment.cash_register_id.
 * Uso: npm run cash:verify-schema
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cash_registers'
  `;
  assert(tables.length === 1, 'Falta tabla cash_registers (aplica migración cash_registers)');

  const cols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_registers'
    ORDER BY ordinal_position
  `;
  const names = cols.map((c) => c.column_name);
  for (const required of [
    'id',
    'business_date',
    'opening_amount',
    'opened_by',
    'opened_at',
    'status',
    'closed_by',
    'closed_at',
    'counted_cash',
    'notes',
  ]) {
    assert(names.includes(required), `Falta columna cash_registers.${required}`);
  }

  const payFk = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Payment'
      AND column_name = 'cash_register_id'
  `;
  assert(payFk.length === 1, 'Falta Payment.cash_register_id');

  console.log(
    JSON.stringify(
      {
        ok: true,
        table: 'cash_registers',
        columns: names,
        paymentFk: 'cash_register_id',
      },
      null,
      2
    )
  );
  console.log('VERIFY OK');
}

main()
  .catch((e) => {
    console.error('VERIFY FALLÓ:', e.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
