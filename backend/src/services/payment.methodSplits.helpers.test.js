import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  assertCanVoidLine,
  assertSplitsMatchAmount,
  buildIsCashLookup,
  computeTenderedAndChange,
  isMixedPaymentMethods,
  normalizeMethodSplits,
  primaryPaymentMethodId,
  resolveMethodSplitsFromCreateBody,
  sumCashSplitAmount,
  sumSplitAmounts,
} from './payment.methodSplits.helpers.js';

describe('normalizeMethodSplits', () => {
  it('normaliza ids y montos > 0 sin duplicar métodos', () => {
    const splits = normalizeMethodSplits([
      { paymentMethodId: '1', amount: 40 },
      { paymentMethodId: 2, amount: 60.5 },
    ]);
    assert.deepEqual(splits, [
      { paymentMethodId: 1, amount: 40 },
      { paymentMethodId: 2, amount: 60.5 },
    ]);
  });

  it('rechaza vacío, monto ≤ 0, id inválido y método duplicado', () => {
    assert.throws(() => normalizeMethodSplits([]), /methodSplits/);
    assert.throws(
      () => normalizeMethodSplits([{ paymentMethodId: 1, amount: 0 }]),
      /mayor a 0/
    );
    assert.throws(
      () => normalizeMethodSplits([{ paymentMethodId: 0, amount: 10 }]),
      /método de pago válido/
    );
    assert.throws(
      () =>
        normalizeMethodSplits([
          { paymentMethodId: 1, amount: 10 },
          { paymentMethodId: 1, amount: 20 },
        ]),
      /repetir el mismo método/
    );
  });
});

describe('sumSplitAmounts + assertSplitsMatchAmount', () => {
  it('suma en centavos exactos', () => {
    assert.equal(
      sumSplitAmounts([
        { amount: 10.1 },
        { amount: 20.2 },
        { amount: 0.05 },
      ]),
      30.35
    );
  });

  it('acepta Σ splits === amount sin tolerancia', () => {
    assert.doesNotThrow(() =>
      assertSplitsMatchAmount(
        [
          { amount: 50 },
          { amount: 50 },
        ],
        100
      )
    );
  });

  it('rechaza descuadre aunque sea de 1 centavo', () => {
    assert.throws(
      () =>
        assertSplitsMatchAmount(
          [
            { amount: 50 },
            { amount: 49.99 },
          ],
          100
        ),
      /exactamente igual/
    );
  });
});

describe('resolveMethodSplitsFromCreateBody', () => {
  it('methodSplits[] tiene prioridad y valida contra el total', () => {
    const splits = resolveMethodSplitsFromCreateBody(
      {
        paymentMethodId: 99,
        methodSplits: [
          { paymentMethodId: 1, amount: 40 },
          { paymentMethodId: 2, amount: 60 },
        ],
      },
      100
    );
    assert.equal(splits.length, 2);
    assert.equal(primaryPaymentMethodId(splits), 1);
    assert.equal(isMixedPaymentMethods(splits), true);
  });

  it('paymentMethodId suelto → 1 split = total (compat)', () => {
    const splits = resolveMethodSplitsFromCreateBody({ paymentMethodId: 3 }, 85.5);
    assert.deepEqual(splits, [{ paymentMethodId: 3, amount: 85.5 }]);
    assert.equal(isMixedPaymentMethods(splits), false);
  });

  it('falla si no hay método ni splits, o si splits ≠ amount', () => {
    assert.throws(() => resolveMethodSplitsFromCreateBody({}, 100), /método de pago/);
    assert.throws(
      () =>
        resolveMethodSplitsFromCreateBody(
          { methodSplits: [{ paymentMethodId: 1, amount: 30 }] },
          100
        ),
      /exactamente igual/
    );
  });
});

describe('computeTenderedAndChange (vuelto solo efectivo)', () => {
  const isCash = buildIsCashLookup([
    { id: 1, isCash: true },
    { id: 2, isCash: false },
    { id: 3, isCash: false },
  ]);

  it('sin cash: rechaza tendered y deja nulls', () => {
    assert.throws(
      () =>
        computeTenderedAndChange({
          splits: [{ paymentMethodId: 2, amount: 100 }],
          isCashByMethodId: isCash,
          amountTendered: 100,
        }),
      /solo aplica cuando hay efectivo/
    );

    const result = computeTenderedAndChange({
      splits: [
        { paymentMethodId: 2, amount: 40 },
        { paymentMethodId: 3, amount: 60 },
      ],
      isCashByMethodId: isCash,
    });
    assert.equal(result.amountTendered, null);
    assert.equal(result.changeGiven, null);
    assert.equal(result.cashSplitAmount, 0);
  });

  it('con cash: vuelto = recibido − porción efectivo (no el total del ticket)', () => {
    assert.equal(
      sumCashSplitAmount(
        [
          { paymentMethodId: 1, amount: 40 },
          { paymentMethodId: 2, amount: 60 },
        ],
        isCash
      ),
      40
    );

    const result = computeTenderedAndChange({
      splits: [
        { paymentMethodId: 1, amount: 40 },
        { paymentMethodId: 2, amount: 60 },
      ],
      isCashByMethodId: isCash,
      amountTendered: 50,
    });

    assert.ok(result.amountTendered instanceof Prisma.Decimal);
    assert.equal(moneyNumber(result.amountTendered), 50);
    assert.equal(moneyNumber(result.changeGiven), 10);
    assert.equal(result.cashSplitAmount, 40);
  });

  it('con cash sin recibido: asume exacto (vuelto 0)', () => {
    const result = computeTenderedAndChange({
      splits: [{ paymentMethodId: 1, amount: 75 }],
      isCashByMethodId: isCash,
    });
    assert.equal(moneyNumber(result.amountTendered), 75);
    assert.equal(moneyNumber(result.changeGiven), 0);
  });

  it('rechaza recibido menor que la porción en efectivo', () => {
    assert.throws(
      () =>
        computeTenderedAndChange({
          splits: [
            { paymentMethodId: 1, amount: 40 },
            { paymentMethodId: 2, amount: 60 },
          ],
          isCashByMethodId: isCash,
          amountTendered: 39.99,
        }),
      /no puede ser menor/
    );
  });
});

describe('assertCanVoidLine', () => {
  it('permite void de línea con un solo método', () => {
    assert.doesNotThrow(() =>
      assertCanVoidLine([{ paymentMethodId: 1, amount: 100 }])
    );
  });

  it('bloquea void de línea cuando hay más de un método', () => {
    assert.throws(
      () =>
        assertCanVoidLine([
          { paymentMethodId: 1, amount: 40 },
          { paymentMethodId: 2, amount: 60 },
        ]),
      (err) => {
        assert.match(err.message, /varios métodos de pago/);
        assert.equal(err.statusCode, 400);
        assert.equal(err.reason, 'MIXED_METHODS_VOID_LINE_FORBIDDEN');
        return true;
      }
    );
  });
});

function moneyNumber(value) {
  return Number(value);
}
