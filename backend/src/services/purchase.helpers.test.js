import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  derivePurchaseStatus,
  normalizeOrderItems,
  normalizeReceiptItems,
} from './purchase.helpers.js';

describe('normalizeOrderItems', () => {
  it('normaliza artículos y calcula subtotales', () => {
    assert.deepEqual(
      normalizeOrderItems([{ productId: '2', quantity: '3', unitCost: '4.25' }]),
      [{ productId: 2, quantity: 3, unitCost: 4.25, subtotal: 12.75 }]
    );
  });

  it('rechaza productos repetidos, costos negativos y más de 100 artículos', () => {
    assert.throws(
      () =>
        normalizeOrderItems([
          { productId: 1, quantity: 1, unitCost: 1 },
          { productId: 1, quantity: 1, unitCost: 1 },
        ]),
      /repetido/
    );
    assert.throws(
      () => normalizeOrderItems([{ productId: 1, quantity: 1, unitCost: -1 }]),
      /mayor o igual a cero/
    );
    assert.throws(
      () =>
        normalizeOrderItems(
          Array.from({ length: 101 }, (_, index) => ({
            productId: index + 1,
            quantity: 1,
            unitCost: 1,
          }))
        ),
      /Máximo 100/
    );
  });
});

describe('normalizeReceiptItems', () => {
  it('acepta costo opcional y nombres snake_case legacy', () => {
    assert.deepEqual(
      normalizeReceiptItems([
        { purchase_item_id: '8', quantity: '2' },
        { purchaseItemId: 9, quantity: 1, unitCost: 0 },
      ]),
      [
        { purchaseItemId: 8, quantity: 2, unitCost: null },
        { purchaseItemId: 9, quantity: 1, unitCost: 0 },
      ]
    );
  });

  it('rechaza cantidades no positivas y líneas repetidas', () => {
    assert.throws(
      () => normalizeReceiptItems([{ purchaseItemId: 1, quantity: 0 }]),
      /entero positivo/
    );
    assert.throws(
      () =>
        normalizeReceiptItems([
          { purchaseItemId: 1, quantity: 1 },
          { purchaseItemId: 1, quantity: 1 },
        ]),
      /repetido/
    );
  });
});

describe('derivePurchaseStatus', () => {
  const items = (receivedQuantity) => [{ quantity: 10, receivedQuantity }];

  it('deriva ordered, partially_received y received', () => {
    assert.equal(derivePurchaseStatus(items(0)), 'ordered');
    assert.equal(derivePurchaseStatus(items(4)), 'partially_received');
    assert.equal(derivePurchaseStatus(items(10)), 'received');
  });
});
