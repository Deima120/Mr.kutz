/**
 * Gate Etapa 1 pago mixto: Payment count == payment_method_splits count (1:1).
 * Uso: node scripts/verify-payment-method-splits-backfill.mjs
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [paymentCount, splitCount, distinctPayments, cashMethods, sample] = await Promise.all([
    prisma.payment.count(),
    prisma.paymentMethodSplit.count(),
    prisma.paymentMethodSplit.groupBy({ by: ['paymentId'] }).then((rows) => rows.length),
    prisma.paymentMethod.findMany({
      where: { isCash: true },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.payment.findMany({
      take: 3,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        amount: true,
        paymentMethodId: true,
        methodSplits: {
          select: { paymentMethodId: true, amount: true },
        },
      },
    }),
  ]);

  console.log('--- Gate payment_method_splits ---');
  console.log(JSON.stringify({
    paymentCount,
    splitCount,
    paymentsWithSplit: distinctPayments,
    match1to1: paymentCount === splitCount && paymentCount === distinctPayments,
    cashMethods,
    sample,
  }, null, 2));

  if (paymentCount !== splitCount || paymentCount !== distinctPayments) {
    process.exitCode = 1;
    console.error('GATE FALLÓ: se esperaba 1 split por cada Payment.');
    return;
  }

  console.log('GATE OK: Payment === splits (1:1).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
