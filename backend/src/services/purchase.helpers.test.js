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

  it('rechaza productos repetidos, costos no positivos y más de 100 artículos', () => {
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
      /mayor que cero/
    );
    assert.throws(
      () => normalizeOrderItems([{ productId: 1, quantity: 1, unitCost: 0 }]),
      /mayor que cero/
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
  it('acepta nombres snake_case legacy y descarta el costo que envie el cliente', () => {
    assert.deepEqual(
      normalizeReceiptItems([
        { purchase_item_id: '8', quantity: '2', unitCost: 4.5 },
        { purchaseItemId: 9, quantity: 1, unitCost: 2 },
      ]),
      [
        { purchaseItemId: 8, quantity: 2 },
        { purchaseItemId: 9, quantity: 1 },
      ]
    );
  });

  it('no exige costo: la recepcion lo toma del PurchaseItem de la orden', () => {
    assert.deepEqual(normalizeReceiptItems([{ purchaseItemId: 3, quantity: 5 }]), [
      { purchaseItemId: 3, quantity: 5 },
    ]);
  });

  it('un costo manipulado en la peticion no llega al resultado', () => {
    const [item] = normalizeReceiptItems([
      { purchaseItemId: 4, quantity: 1, unitCost: 999999 },
    ]);
    assert.equal(item.unitCost, undefined);
  });

  it('rechaza cantidades no positivas y líneas repetidas', () => {
    assert.throws(
      () => normalizeReceiptItems([{ purchaseItemId: 1, quantity: 0 }]),
      /entero positivo/
    );
    assert.throws(
      () =>
        normalizeReceiptItems([
          { purchaseItemId: 1, quantity: 1, unitCost: 2 },
          { purchaseItemId: 1, quantity: 1, unitCost: 2 },
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
