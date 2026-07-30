/**
 * Smoke Etapa 6 — caja (CashRegister) contra BD real.
 *
 * Modos (según estado del día Colombia):
 * - sin fila: ciclo completo open → cobrar → summary → close → NO_OPEN
 * - OPEN: cobrar + summary (no cierra caja operativa)
 * - CLOSED del día: summary + create bloqueado (no se puede reabrir el mismo día)
 *
 * Uso: npm run cash:smoke
 */

import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { getColombiaTodayYmd, ymdToUtcDate } from '../src/utils/colombiaTime.js';
import {
  closeCashRegister,
  getCashRegisterSummary,
  getCurrentCashRegister,
  openCashRegister,
} from '../src/services/cashRegister.service.js';
import {
  create,
  getPaymentMethods,
  voidPayment,
} from '../src/services/payment.service.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function findAdminUser() {
  const admin = await prisma.user.findFirst({
    where: { isActive: true, role: { name: 'admin' } },
    select: { id: true, email: true },
  });
  assert(admin?.id, 'No hay usuario admin activo (npm run create-admin)');
  return admin;
}

async function assertCreateBlockedWithoutOpen(cashMethodId, adminId, report) {
  let blocked = false;
  try {
    await create({
      notes: '[SMOKE] sin caja',
      paymentMethodId: cashMethodId,
      lines: [{ type: 'manual', unitPrice: 1000, description: '[SMOKE] blocked' }],
      createdBy: adminId,
    });
  } catch (err) {
    blocked = err?.reason === 'NO_OPEN_CASH_REGISTER';
    assert(blocked, `bloqueo inesperado: ${err?.reason || err?.message}`);
  }
  assert(blocked, 'create sin OPEN debió fallar con NO_OPEN_CASH_REGISTER');
  report.push('create sin OPEN → NO_OPEN_CASH_REGISTER OK');
}

async function createLinkedPayment({ register, cash, card, adminId, report, createdPaymentIds }) {
  const payment = await create({
    notes: '[SMOKE] cash register link',
    amountTendered: 30000,
    methodSplits: [
      { paymentMethodId: cash.id, amount: 20000 },
      { paymentMethodId: card.id, amount: 15000 },
    ],
    lines: [{ type: 'manual', unitPrice: 35000, description: '[SMOKE] caja mixto' }],
    createdBy: adminId,
  });
  createdPaymentIds.push(payment.id);
  assert(payment.cashRegisterId === register.id, `cashRegisterId=${payment.cashRegisterId}`);
  assert(payment.changeGiven === 10000, `change=${payment.changeGiven}`);
  report.push(
    `payment OK #${payment.id} → cashRegisterId=${payment.cashRegisterId} change=${payment.changeGiven}`
  );
  return payment;
}

async function main() {
  const report = [];
  const createdPaymentIds = [];
  let openedBySmoke = false;
  let closedBySmoke = false;
  const admin = await findAdminUser();
  report.push(`admin #${admin.id} (${admin.email})`);

  try {
    const methods = await getPaymentMethods();
    const cash = methods.find((m) => m.isCash);
    const card =
      methods.find((m) => !m.isCash && m.name === 'tarjeta') || methods.find((m) => !m.isCash);
    assert(cash && card, 'Faltan métodos cash / no-cash');

    const todayYmd = getColombiaTodayYmd();
    const todayDate = ymdToUtcDate(todayYmd);
    const dayRow = await prisma.cashRegister.findUnique({ where: { businessDate: todayDate } });
    const before = await getCurrentCashRegister();
    let register = before.register;

    if (register?.isStaleOpen) {
      report.push(
        `AVISO: OPEN stale del ${register.businessDate} (daysOpen=${register.daysOpen})`
      );
    }

    if (!register && dayRow?.status === 'CLOSED') {
      report.push(`día ${todayYmd} ya CLOSED #${dayRow.id} — modo parcial (sin reabrir)`);
      const summary = await getCashRegisterSummary(dayRow.id);
      assert(summary.register?.status === 'CLOSED', 'summary de caja cerrada');
      report.push(
        `summary CLOSED OK expectedCash=${summary.expectedCash} payments=${summary.paymentCount}`
      );
      await assertCreateBlockedWithoutOpen(cash.id, admin.id, report);
    } else {
      if (!register) {
        register = await openCashRegister({
          openingAmount: 100000,
          notes: '[SMOKE] open cash register',
          openedById: admin.id,
        });
        openedBySmoke = true;
        assert(register.status === 'OPEN', 'caja recién abierta debe estar OPEN');
        assert(register.openingAmount === 100000, `openingAmount=${register.openingAmount}`);
        report.push(
          `open OK #${register.id} day=${register.businessDate} base=${register.openingAmount}`
        );
      } else {
        report.push(
          `reusa OPEN #${register.id} day=${register.businessDate}` +
            (register.isStaleOpen ? ' [STALE]' : '')
        );
      }

      await createLinkedPayment({
        register,
        cash,
        card,
        adminId: admin.id,
        report,
        createdPaymentIds,
      });

      const summary = await getCashRegisterSummary(register.id);
      assert(summary.paymentCount >= 1, 'summary.paymentCount');
      assert(Number.isFinite(summary.expectedCash), `expectedCash=${summary.expectedCash}`);
      const cashRow = (summary.byMethod || []).find((m) => m.paymentMethodId === cash.id);
      assert(cashRow && cashRow.amount >= 20000, 'summary debe incluir split efectivo');
      report.push(
        `summary OK expectedCash=${summary.expectedCash} cashCollected=${summary.cashCollected}`
      );

      if (openedBySmoke) {
        const closed = await closeCashRegister({
          countedCash: summary.expectedCash,
          notes: '[SMOKE] close',
          closedById: admin.id,
        });
        closedBySmoke = true;
        assert(closed.register?.status === 'CLOSED', 'debe quedar CLOSED');
        report.push(`close OK #${closed.register.id} expectedCash=${closed.expectedCash}`);
        await assertCreateBlockedWithoutOpen(cash.id, admin.id, report);
      } else {
        report.push('skip close/NO_OPEN (caja preexistente; no se cierra)');
      }
    }

    console.log('--- Smoke cash_registers ---');
    for (const line of report) console.log(`✔ ${line}`);
    console.log('SMOKE OK');
  } finally {
    for (const id of createdPaymentIds) {
      try {
        await voidPayment(id, {
          voidReason: '[SMOKE] cleanup cash register',
          voidedBy: admin.id,
        });
        console.log(`cleanup void payment #${id}`);
      } catch (err) {
        console.warn(`cleanup payment #${id}: ${err?.message}`);
      }
    }
    if (openedBySmoke && !closedBySmoke) {
      try {
        await closeCashRegister({
          notes: '[SMOKE] cleanup close',
          closedById: admin.id,
        });
        console.log('cleanup close register');
      } catch (err) {
        console.warn(`cleanup close: ${err?.message}`);
      }
    }
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error('SMOKE FALLÓ:', err);
  process.exitCode = 1;
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
});
