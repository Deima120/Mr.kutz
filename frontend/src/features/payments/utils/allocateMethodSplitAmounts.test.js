import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SPLIT_SOURCE_AUTO,
  SPLIT_SOURCE_MANUAL,
  addMethodSplitRow,
  allocateMethodSplitAmounts,
  methodSplitAllocationStatus,
  remainingMethodSplitAmount,
  removeMethodSplitRow,
  setMethodSplitManualAmount,
} from './allocateMethodSplitAmounts.js';

describe('allocateMethodSplitAmounts — un solo método', () => {
  it('el monto sigue el total del carrito (auto)', () => {
    const rows = allocateMethodSplitAmounts({
      total: 140000,
      rows: [{ key: 'a', paymentMethodId: '1', amount: 0, source: SPLIT_SOURCE_MANUAL }],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount, 140000);
    assert.equal(rows[0].source, SPLIT_SOURCE_AUTO);
  });

  it('al cambiar el total, el único método se actualiza', () => {
    const rows = allocateMethodSplitAmounts({
      total: 95000,
      rows: [{ key: 'a', amount: 140000, source: SPLIT_SOURCE_AUTO }],
    });
    assert.equal(rows[0].amount, 95000);
  });
});

describe('allocateMethodSplitAmounts — 2 métodos (sin mitad/mitad)', () => {
  it('escribir 70000 en el primero autocompleta 70000 en el segundo', () => {
    const afterAdd = addMethodSplitRow({
      total: 140000,
      rows: [{ key: 'cash', paymentMethodId: '1', amount: 140000, source: SPLIT_SOURCE_AUTO }],
      newRow: { key: 'card', paymentMethodId: '2' },
    });
    // Tras agregar: sink = última auto → card absorbe total; cash auto queda en 0
    assert.equal(afterAdd.find((r) => r.key === 'cash').amount, 0);
    assert.equal(afterAdd.find((r) => r.key === 'card').amount, 140000);

    const rows = setMethodSplitManualAmount({
      total: 140000,
      rows: afterAdd,
      key: 'cash',
      amount: 70000,
    });
    assert.equal(rows.find((r) => r.key === 'cash').amount, 70000);
    assert.equal(rows.find((r) => r.key === 'cash').source, SPLIT_SOURCE_MANUAL);
    assert.equal(rows.find((r) => r.key === 'card').amount, 70000);
    assert.equal(rows.find((r) => r.key === 'card').source, SPLIT_SOURCE_AUTO);
  });

  it('reparto desigual: 50000 cash → 150000 en el otro (no mitad)', () => {
    const rows = setMethodSplitManualAmount({
      total: 200000,
      rows: [
        { key: 'cash', amount: 0, source: SPLIT_SOURCE_AUTO },
        { key: 'transfer', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'cash',
      amount: 50000,
    });
    assert.equal(rows.find((r) => r.key === 'cash').amount, 50000);
    assert.equal(rows.find((r) => r.key === 'transfer').amount, 150000);
  });

  it('reparto 30000 / 65000 sobre total 95000', () => {
    const rows = setMethodSplitManualAmount({
      total: 95000,
      rows: [
        { key: 'cash', amount: 0, source: SPLIT_SOURCE_AUTO },
        { key: 'card', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'cash',
      amount: 30000,
    });
    assert.equal(rows.find((r) => r.key === 'card').amount, 65000);
  });
});

describe('allocateMethodSplitAmounts — no pisar manual', () => {
  it('editar un valor que era auto lo marca manual y no lo vuelve a pisar', () => {
    let rows = setMethodSplitManualAmount({
      total: 140000,
      rows: [
        { key: 'a', amount: 0, source: SPLIT_SOURCE_AUTO },
        { key: 'b', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'a',
      amount: 70000,
    });
    assert.equal(rows.find((r) => r.key === 'b').amount, 70000);
    assert.equal(rows.find((r) => r.key === 'b').source, SPLIT_SOURCE_AUTO);

    // Usuario corrige el auto de b a 60000
    rows = setMethodSplitManualAmount({
      total: 140000,
      rows,
      key: 'b',
      amount: 60000,
    });
    assert.equal(rows.find((r) => r.key === 'b').amount, 60000);
    assert.equal(rows.find((r) => r.key === 'b').source, SPLIT_SOURCE_MANUAL);
    // Ambos manuales: no hay sink → no se recalcula a 70000
    assert.equal(rows.find((r) => r.key === 'a').amount, 70000);
    assert.equal(remainingMethodSplitAmount(140000, rows), 10000);
  });

  it('cambiar el total solo recalcula filas auto, no las manuales', () => {
    const rows = allocateMethodSplitAmounts({
      total: 180000,
      rows: [
        { key: 'a', amount: 50000, source: SPLIT_SOURCE_MANUAL },
        { key: 'b', amount: 90000, source: SPLIT_SOURCE_AUTO },
      ],
    });
    assert.equal(rows.find((r) => r.key === 'a').amount, 50000);
    assert.equal(rows.find((r) => r.key === 'b').amount, 130000);
  });
});

describe('allocateMethodSplitAmounts — 3+ métodos y quitar fila', () => {
  it('con 3 métodos, el último auto absorbe el restante', () => {
    const rows = setMethodSplitManualAmount({
      total: 100000,
      rows: [
        { key: 'a', amount: 20000, source: SPLIT_SOURCE_MANUAL },
        { key: 'b', amount: 30000, source: SPLIT_SOURCE_MANUAL },
        { key: 'c', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'a',
      amount: 20000,
    });
    assert.equal(rows.find((r) => r.key === 'c').amount, 50000);
    assert.equal(rows.find((r) => r.key === 'b').amount, 30000);
  });

  it('quitar un método recalcula el restante en el que quede', () => {
    const mixed = [
      { key: 'cash', amount: 50000, source: SPLIT_SOURCE_MANUAL },
      { key: 'card', amount: 150000, source: SPLIT_SOURCE_AUTO },
    ];
    const afterRemove = removeMethodSplitRow({
      total: 200000,
      rows: mixed,
      key: 'card',
    });
    assert.equal(afterRemove.length, 1);
    assert.equal(afterRemove[0].key, 'cash');
    assert.equal(afterRemove[0].amount, 200000);
    assert.equal(afterRemove[0].source, SPLIT_SOURCE_AUTO);
  });

  it('quitar el manual deja el auto = total', () => {
    const afterRemove = removeMethodSplitRow({
      total: 200000,
      rows: [
        { key: 'cash', amount: 50000, source: SPLIT_SOURCE_MANUAL },
        { key: 'card', amount: 150000, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'cash',
    });
    assert.equal(afterRemove.length, 1);
    assert.equal(afterRemove[0].amount, 200000);
  });
});

describe('methodSplitAllocationStatus — indicador en vivo', () => {
  it('complete / short / over', () => {
    assert.deepEqual(
      methodSplitAllocationStatus(100, [
        { amount: 40 },
        { amount: 60 },
      ]),
      { kind: 'complete', remaining: 0 }
    );
    assert.deepEqual(
      methodSplitAllocationStatus(100, [{ amount: 40 }, { amount: 50 }]),
      { kind: 'short', remaining: 10 }
    );
    assert.deepEqual(
      methodSplitAllocationStatus(100, [{ amount: 70 }, { amount: 40 }]),
      { kind: 'over', remaining: 10 }
    );
  });
});

describe('amountTendered no participa en el reparto', () => {
  it('el helper solo mira split.amount; tendered es ortogonal', () => {
    const rows = setMethodSplitManualAmount({
      total: 200000,
      rows: [
        { key: 'cash', amount: 0, source: SPLIT_SOURCE_AUTO },
        { key: 'transfer', amount: 0, source: SPLIT_SOURCE_AUTO },
      ],
      key: 'cash',
      amount: 50000,
    });
    // Cliente entrega 60000 físicos → vuelto 10000; transfer sigue 150000
    const cashSplit = 50000;
    const amountTendered = 60000;
    const changeGiven = amountTendered - cashSplit;
    assert.equal(rows.find((r) => r.key === 'transfer').amount, 150000);
    assert.equal(changeGiven, 10000);
    assert.equal(rows.find((r) => r.key === 'cash').amount, cashSplit);
  });
});
