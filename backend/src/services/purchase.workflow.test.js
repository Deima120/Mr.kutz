import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { weightedAverageCost } from './inventory.helpers.js';
import {
  derivePurchaseStatus,
  normalizeOrderItems,
  normalizeReceiptItems,
} from './purchase.helpers.js';

describe('flujo orden → recepción → inventario', () => {
  it('crea una orden sin stock y deriva recepciones parcial y total', () => {
    const stockBefore = 4;
    const orderItems = normalizeOrderItems([
      { productId: 10, quantity: 6, unitCost: 20 },
    ]);

    assert.equal(stockBefore, 4, 'crear la orden no modifica el stock');
    assert.equal(derivePurchaseStatus([{ quantity: 6, receivedQuantity: 0 }]), 'ordered');

    const firstReceipt = normalizeReceiptItems([
      { purchaseItemId: 1, quantity: 2, unitCost: 22 },
    ]);
    const stockAfterPartial = stockBefore + firstReceipt[0].quantity;
    const costAfterPartial = weightedAverageCost(stockBefore, 18, 2, 22);

    assert.equal(stockAfterPartial, 6);
    assert.equal(costAfterPartial, 19.33);
    assert.equal(
      derivePurchaseStatus([{ quantity: orderItems[0].quantity, receivedQuantity: 2 }]),
      'partially_received'
    );

    const finalReceipt = normalizeReceiptItems([
      { purchaseItemId: 1, quantity: 4, unitCost: 20 },
    ]);
    assert.equal(stockAfterPartial + finalReceipt[0].quantity, 10);
    assert.equal(derivePurchaseStatus([{ quantity: 6, receivedQuantity: 6 }]), 'received');
  });

  it('rechaza cantidades y costos inválidos antes de recibir', () => {
    assert.throws(
      () => normalizeOrderItems([{ productId: 10, quantity: 0, unitCost: 20 }]),
      /entero positivo/
    );
    assert.throws(
      () => normalizeOrderItems([{ productId: 10, quantity: 1, unitCost: -1 }]),
      /mayor que cero/
    );
    assert.throws(
      () => normalizeReceiptItems([{ purchaseItemId: 1, quantity: 0, unitCost: 20 }]),
      /entero positivo/
    );
  });
});
