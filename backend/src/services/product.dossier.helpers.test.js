import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCostSummaryFromReceipts,
  buildSuppliersFromReceipts,
  clampMovementsPage,
} from './product.dossier.helpers.js';

describe('clampMovementsPage', () => {
  it('normaliza limit/offset y respeta el máximo', () => {
    assert.deepEqual(clampMovementsPage({}), { limit: 20, offset: 0 });
    assert.deepEqual(clampMovementsPage({ limit: 0, offset: -5 }), { limit: 20, offset: 0 });
    assert.deepEqual(clampMovementsPage({ limit: 500, offset: 40 }), { limit: 100, offset: 40 });
    assert.deepEqual(clampMovementsPage({ limit: '10', offset: '20' }), { limit: 10, offset: 20 });
  });
});

describe('buildCostSummaryFromReceipts', () => {
  it('calcula promedio ponderado solo desde recepciones', () => {
    const receipts = [
      { quantity: 2, unitCost: 10, receivedAt: '2026-01-02' },
      { quantity: 2, unitCost: 20, receivedAt: '2026-01-01' },
    ];
    const summary = buildCostSummaryFromReceipts(receipts, 99);
    assert.equal(summary.averageCostFromReceipts, 15);
    assert.equal(summary.catalogAverageCost, 99);
    assert.equal(summary.totalReceivedQuantity, 4);
    assert.equal(summary.receiptCount, 2);
    assert.equal(summary.lastUnitCost, 10);
    assert.equal(summary.lastReceivedAt, '2026-01-02');
  });

  it('devuelve null de promedio cuando no hay recepciones', () => {
    const summary = buildCostSummaryFromReceipts([], null);
    assert.equal(summary.averageCostFromReceipts, null);
    assert.equal(summary.catalogAverageCost, null);
    assert.equal(summary.totalReceivedQuantity, 0);
    assert.equal(summary.receiptCount, 0);
  });
});

describe('buildSuppliersFromReceipts', () => {
  it('agrega por proveedor y ordena por última recepción', () => {
    const suppliers = buildSuppliersFromReceipts([
      {
        supplierId: 1,
        supplierName: 'Alpha',
        quantity: 3,
        unitCost: 12,
        receivedAt: '2026-03-01',
      },
      {
        supplierId: 2,
        supplierName: 'Beta',
        quantity: 1,
        unitCost: 9,
        receivedAt: '2026-04-01',
      },
      {
        supplierId: 1,
        supplierName: 'Alpha',
        quantity: 2,
        unitCost: 14,
        receivedAt: '2026-05-01',
      },
      {
        supplierId: null,
        supplierName: 'Sin proveedor',
        quantity: 5,
        unitCost: 1,
        receivedAt: '2026-06-01',
      },
    ]);

    assert.equal(suppliers.length, 2);
    assert.equal(suppliers[0].supplierId, 1);
    assert.equal(suppliers[0].receiptCount, 2);
    assert.equal(suppliers[0].totalQuantity, 5);
    assert.equal(suppliers[0].lastUnitCost, 14);
    assert.equal(suppliers[1].supplierId, 2);
    assert.equal(suppliers[1].totalQuantity, 1);
  });
});
