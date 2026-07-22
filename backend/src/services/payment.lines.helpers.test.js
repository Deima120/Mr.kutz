import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertSingleClientForServiceLines,
  derivePaymentType,
  normalizeCreateLineInputs,
  sumActiveLineAmounts,
} from './payment.lines.helpers.js';

describe('normalizeCreateLineInputs', () => {
  it('acepta lines[] mixtas service + product + manual', () => {
    const lines = normalizeCreateLineInputs({
      lines: [
        { type: 'service', appointmentId: 10 },
        { type: 'product', productId: 3, quantity: 2 },
        { type: 'manual', unitPrice: 5, description: 'Propina' },
      ],
    });
    assert.equal(lines.length, 3);
    assert.equal(lines[0].type, 'service');
    assert.equal(lines[1].quantity, 2);
    assert.equal(lines[2].description, 'Propina');
  });

  it('rechaza amount junto con lines[]', () => {
    assert.throws(
      () =>
        normalizeCreateLineInputs({
          amount: 100,
          lines: [{ type: 'manual', unitPrice: 10, description: 'x' }],
        }),
      /no se envía manualmente/
    );
  });

  it('rechaza body sin lines[] y campos de cabecera legacy', () => {
    assert.throws(() => normalizeCreateLineInputs({}), /lines\[\]/);
    assert.throws(
      () => normalizeCreateLineInputs({ appointmentId: 7 }),
      /lines\[\]/
    );
    assert.throws(
      () => normalizeCreateLineInputs({ productId: 2, productQuantity: 4 }),
      /lines\[\]/
    );
    assert.throws(
      () => normalizeCreateLineInputs({ amount: 15.5, notes: 'varios' }),
      /no se envía manualmente/
    );
  });
});

describe('sumActiveLineAmounts + derivePaymentType', () => {
  it('suma solo líneas activas y clasifica tipos', () => {
    const lines = [
      { lineType: 'service', lineAmount: 20, voidedAt: null },
      { lineType: 'product', lineAmount: 10.5, voidedAt: null },
      { lineType: 'product', lineAmount: 99, voidedAt: new Date() },
    ];
    assert.equal(sumActiveLineAmounts(lines), 30.5);
    assert.equal(derivePaymentType(lines), 'mixed');
    assert.equal(
      derivePaymentType([{ lineType: 'manual', lineAmount: 5, voidedAt: null }]),
      'cash'
    );
    assert.equal(derivePaymentType(lines.map((l) => ({ ...l, voidedAt: new Date() }))), 'voided');
  });
});

describe('assertSingleClientForServiceLines', () => {
  it('permite un solo cliente y rechaza mezcla', () => {
    const map = new Map([
      [1, { clientId: 9 }],
      [2, { clientId: 9 }],
      [3, { clientId: 8 }],
    ]);
    assert.equal(
      assertSingleClientForServiceLines(map, [
        { appointmentId: 1 },
        { appointmentId: 2 },
      ]),
      9
    );
    assert.throws(
      () =>
        assertSingleClientForServiceLines(map, [
          { appointmentId: 1 },
          { appointmentId: 3 },
        ]),
      /distintos clientes/
    );
  });
});
