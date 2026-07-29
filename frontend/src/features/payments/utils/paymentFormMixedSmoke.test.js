/**
 * Smoke Etapa 4 — simula el cableado del formulario (sin React):
 * 1 método, 2+, editar auto, quitar método, tendered ortogonal.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SPLIT_SOURCE_AUTO,
  addMethodSplitRow,
  allocateMethodSplitAmounts,
  methodSplitAllocationStatus,
  removeMethodSplitRow,
  setMethodSplitManualAmount,
} from './allocateMethodSplitAmounts.js';

describe('smoke formulario pago mixto (flujo UI)', () => {
  it('1 método: monto = total', () => {
    const total = 140000;
    const rows = allocateMethodSplitAmounts({
      total,
      rows: [{ key: 'a', paymentMethodId: '1', amount: 0, source: SPLIT_SOURCE_AUTO }],
    });
    assert.equal(rows[0].amount, total);
    assert.equal(methodSplitAllocationStatus(total, rows).kind, 'complete');
  });

  it('2+ métodos: escribir en el primero autocompleta el resto', () => {
    const total = 200000;
    let rows = addMethodSplitRow({
      total,
      rows: [{ key: 'cash', paymentMethodId: '1', amount: total, source: SPLIT_SOURCE_AUTO }],
      newRow: { key: 'card', paymentMethodId: '3' },
    });
    rows = setMethodSplitManualAmount({
      total,
      rows,
      key: 'cash',
      amount: 50000,
    });
    assert.equal(rows.find((r) => r.key === 'cash').amount, 50000);
    assert.equal(rows.find((r) => r.key === 'card').amount, 150000);
    assert.equal(methodSplitAllocationStatus(total, rows).kind, 'complete');

    // tendered no mueve el split de tarjeta
    const amountTendered = 60000;
    const cashSplit = rows.find((r) => r.key === 'cash').amount;
    assert.equal(amountTendered - cashSplit, 10000);
    assert.equal(rows.find((r) => r.key === 'card').amount, 150000);
  });

  it('editar un valor auto no lo vuelve a pisar', () => {
    const total = 140000;
    let rows = setMethodSplitManualAmount({
      total,
      rows: [
        { key: 'a', amount: 0, source: SPLIT_SOURCE_AUTO },
        { key: 'b', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'a',
      amount: 70000,
    });
    assert.equal(rows.find((r) => r.key === 'b').source, 'auto');
    assert.equal(rows.find((r) => r.key === 'b').amount, 70000);

    rows = setMethodSplitManualAmount({
      total,
      rows,
      key: 'b',
      amount: 60000,
    });
    assert.equal(rows.find((r) => r.key === 'b').amount, 60000);
    assert.equal(rows.find((r) => r.key === 'b').source, 'manual');
    assert.equal(methodSplitAllocationStatus(total, rows).kind, 'short');
    assert.equal(methodSplitAllocationStatus(total, rows).remaining, 10000);
  });

  it('quitar método recalcula; volver a 1 método = total', () => {
    const total = 95000;
    let rows = setMethodSplitManualAmount({
      total,
      rows: [
        { key: 'cash', amount: 0, source: SPLIT_SOURCE_AUTO },
        { key: 'card', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'cash',
      amount: 30000,
    });
    assert.equal(rows.find((r) => r.key === 'card').amount, 65000);

    rows = removeMethodSplitRow({ total, rows, key: 'card' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount, 95000);
    assert.equal(rows[0].source, 'auto');
  });
});
