/**
 * Verificación de integridad de pagos multi-línea.
 * No modifica datos. Exit 1 si falla alguna aserción crítica.
 *
 * Uso: npm run payments:verify-lines
 */
import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

function dec(value) {
  if (value == null) return 0;
  return Number(value);
}

async function main() {
  const [
    paymentCount,
    paymentsWithLines,
    orphanPayments,
    activeMismatch,
    voidedWithActiveLines,
    legacyColumnsRemaining,
    movementsLinked,
    saleMovementsWithPayment,
    duplicateActiveAppointments,
  ] = await Promise.all([
    prisma.payment.count(),
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT payment_id)::int AS c FROM payment_lines
    `,
    prisma.$queryRaw`
      SELECT p.id
      FROM "Payment" p
      WHERE NOT EXISTS (
        SELECT 1 FROM payment_lines pl WHERE pl.payment_id = p.id
      )
      ORDER BY p.id
      LIMIT 50
    `,
    prisma.$queryRaw`
      SELECT
        p.id,
        p.amount AS header_amount,
        COALESCE(SUM(pl.line_amount) FILTER (WHERE pl.voided_at IS NULL), 0) AS active_lines_sum
      FROM "Payment" p
      LEFT JOIN payment_lines pl ON pl.payment_id = p.id
      WHERE p.voided_at IS NULL
      GROUP BY p.id, p.amount
      HAVING ABS(
        p.amount - COALESCE(SUM(pl.line_amount) FILTER (WHERE pl.voided_at IS NULL), 0)
      ) >= 0.005
      ORDER BY p.id
      LIMIT 50
    `,
    prisma.$queryRaw`
      SELECT p.id, COUNT(pl.id)::int AS active_lines
      FROM "Payment" p
      JOIN payment_lines pl ON pl.payment_id = p.id AND pl.voided_at IS NULL
      WHERE p.voided_at IS NOT NULL
      GROUP BY p.id
      ORDER BY p.id
      LIMIT 50
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS c
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Payment'
        AND column_name IN ('appointment_id', 'product_id', 'product_quantity')
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS c
      FROM "InventoryMovement"
      WHERE payment_line_id IS NOT NULL
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS c
      FROM "InventoryMovement"
      WHERE payment_id IS NOT NULL
        AND (movement_type = 'sale' OR movement_type IS NULL)
    `,
    prisma.$queryRaw`
      SELECT appointment_id, COUNT(*)::int AS c
      FROM payment_lines
      WHERE appointment_id IS NOT NULL AND voided_at IS NULL
      GROUP BY appointment_id
      HAVING COUNT(*) > 1
    `,
  ]);

  const paymentsCovered = Number(paymentsWithLines[0]?.c ?? 0);
  const orphanIds = orphanPayments.map((r) => r.id);
  const mismatches = activeMismatch.map((r) => ({
    id: r.id,
    headerAmount: dec(r.header_amount),
    activeLinesSum: dec(r.active_lines_sum),
  }));
  const voidedBad = voidedWithActiveLines.map((r) => ({
    id: r.id,
    activeLines: r.active_lines,
  }));
  const legacyCols = Number(legacyColumnsRemaining[0]?.c ?? 0);
  const linkedMovements = Number(movementsLinked[0]?.c ?? 0);
  const saleMovements = Number(saleMovementsWithPayment[0]?.c ?? 0);
  const dupAppts = duplicateActiveAppointments.map((r) => ({
    appointmentId: r.appointment_id,
    count: r.c,
  }));

  const checks = {
    paymentCount,
    paymentsWithDistinctLines: paymentsCovered,
    everyPaymentHasLine: orphanIds.length === 0,
    orphanPaymentIds: orphanIds,
    activeHeaderEqualsActiveLinesSum: mismatches.length === 0,
    activeAmountMismatches: mismatches,
    voidedPaymentsHaveNoActiveLines: voidedBad.length === 0,
    voidedWithActiveLineIds: voidedBad,
    noDuplicateActiveAppointmentLines: dupAppts.length === 0,
    duplicateActiveAppointments: dupAppts,
    legacyHeaderColumnsDropped: legacyCols === 0,
    legacyHeaderColumnsRemaining: legacyCols,
    inventoryMovements: {
      saleOrNullTypeWithPaymentId: saleMovements,
      withPaymentLineId: linkedMovements,
    },
  };

  const ok =
    checks.everyPaymentHasLine &&
    checks.activeHeaderEqualsActiveLinesSum &&
    checks.voidedPaymentsHaveNoActiveLines &&
    checks.noDuplicateActiveAppointmentLines &&
    checks.legacyHeaderColumnsDropped &&
    paymentCount === paymentsCovered;

  const report = {
    ok,
    stage: 'payment-drop-legacy-header-columns',
    checkedAt: new Date().toISOString(),
    checks,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
