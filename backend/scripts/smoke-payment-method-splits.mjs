/**
 * Smoke Etapa 5 — pago mixto contra BD real.
 * Crea cobros de prueba, valida mono/mixto/void y anula al final.
 * Uso: node scripts/smoke-payment-method-splits.mjs
 */

import 'dotenv/config';
import {
  create,
  getPaymentMethods,
  voidPayment,
  voidPaymentLine,
} from '../src/services/payment.service.js';
import prisma from '../src/lib/prisma.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const createdIds = [];
  const report = [];

  try {
    const methods = await getPaymentMethods();
    const cash = methods.find((m) => m.isCash);
    const card = methods.find((m) => !m.isCash && m.name === 'tarjeta') || methods.find((m) => !m.isCash);
    assert(cash, 'Falta método isCash=true');
    assert(card, 'Falta método no-cash');
    report.push(`methods: cash=#${cash.id}(${cash.name}) card=#${card.id}(${card.name})`);

    // 1) Mono: un método + recibido/vuelto
    const mono = await create({
      notes: '[SMOKE] mono payment method splits',
      amountTendered: 15000,
      paymentMethodId: cash.id,
      lines: [
        { type: 'manual', unitPrice: 7000, description: '[SMOKE] mono A' },
        { type: 'manual', unitPrice: 3000, description: '[SMOKE] mono B' },
      ],
    });
    createdIds.push(mono.id);
    assert(mono.amount === 10000, `mono amount=${mono.amount}`);
    assert(mono.methodSplits?.length === 1, 'mono debe tener 1 split');
    assert(mono.amountTendered === 15000, `mono tendered=${mono.amountTendered}`);
    assert(mono.changeGiven === 5000, `mono change=${mono.changeGiven}`);
    assert(mono.isMixedMethods === false, 'mono no es mixto');
    report.push(`mono OK #${mono.id} amount=${mono.amount} change=${mono.changeGiven}`);

    // 2) Mixto: efectivo + tarjeta
    const mixto = await create({
      notes: '[SMOKE] mixto payment method splits',
      amountTendered: 25000,
      methodSplits: [
        { paymentMethodId: cash.id, amount: 20000 },
        { paymentMethodId: card.id, amount: 30000 },
      ],
      lines: [{ type: 'manual', unitPrice: 50000, description: '[SMOKE] mixto total' }],
    });
    createdIds.push(mixto.id);
    assert(mixto.amount === 50000, `mixto amount=${mixto.amount}`);
    assert(mixto.methodSplits?.length === 2, 'mixto debe tener 2 splits');
    assert(mixto.isMixedMethods === true, 'mixto isMixedMethods');
    assert(mixto.changeGiven === 5000, `mixto change=${mixto.changeGiven} (solo sobre cash 20k)`);
    report.push(`mixto OK #${mixto.id} splits=${mixto.methodSplits.length} change=${mixto.changeGiven}`);

    // 3) Void línea en mixto → bloqueado
    const mixtoLineId = mixto.lines[0].id;
    let blocked = false;
    try {
      await voidPaymentLine(mixto.id, mixtoLineId, {
        voidReason: '[SMOKE] intento void línea mixto',
      });
    } catch (err) {
      blocked = err?.reason === 'MIXED_METHODS_VOID_LINE_FORBIDDEN';
      assert(blocked, `void mixto razón inesperada: ${err?.message}`);
    }
    assert(blocked, 'void línea mixto debió fallar');
    report.push(`void línea mixto BLOQUEADO OK (#${mixto.id})`);

    // 4) Void línea en mono → recalcula split
    const monoLineB = mono.lines.find((l) => Number(l.lineAmount) === 3000) || mono.lines[1];
    const afterLineVoid = await voidPaymentLine(mono.id, monoLineB.id, {
      voidReason: '[SMOKE] void línea mono',
    });
    assert(afterLineVoid.amount === 7000, `mono tras void amount=${afterLineVoid.amount}`);
    assert(afterLineVoid.methodSplits?.[0]?.amount === 7000, 'split mono recalculado');
    assert(afterLineVoid.changeGiven === 8000, `vuelto tras void=${afterLineVoid.changeGiven}`);
    report.push(`void línea mono OK #${mono.id} → amount=${afterLineVoid.amount} change=${afterLineVoid.changeGiven}`);

    // 5) Descuadre rechazado
    let rejected = false;
    try {
      await create({
        notes: '[SMOKE] descuadre',
        methodSplits: [
          { paymentMethodId: cash.id, amount: 10 },
          { paymentMethodId: card.id, amount: 10 },
        ],
        lines: [{ type: 'manual', unitPrice: 50, description: '[SMOKE] bad' }],
      });
    } catch (err) {
      rejected = /exactamente igual/.test(err?.message || '');
    }
    assert(rejected, 'create descuadrado debió fallar');
    report.push('create descuadrado RECHAZADO OK');

    console.log('--- Smoke payment_method_splits ---');
    for (const line of report) console.log(`✔ ${line}`);
    console.log('SMOKE OK');
  } finally {
    for (const id of createdIds) {
      try {
        await voidPayment(id, { voidReason: '[SMOKE] cleanup etapa 5' });
        console.log(`cleanup void #${id}`);
      } catch (err) {
        console.warn(`cleanup #${id}: ${err?.message}`);
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
