/**
 * Tests del núcleo de inventario (sin BD real).
 * Ejecutar: npm test (desde backend)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  changeStockAtomic,
  weightedAverageCost,
} from './inventory.helpers.js';

function createMockTx({
  inventory = null,
  product = { id: 1, isActive: true },
} = {}) {
  let inv = inventory ? { ...inventory } : null;
  const movements = [];

  return {
    get inventoryState() {
      return inv;
    },
    get movements() {
      return movements;
    },
    product: {
      findUnique: async () => product,
    },
    inventory: {
      findUnique: async () => (inv ? { ...inv } : null),
      create: async ({ data }) => {
        inv = { productId: data.productId, quantity: data.quantity ?? 0 };
        return { ...inv };
      },
      update: async ({ data }) => {
        if (!inv) throw new Error('inventory missing');
        if (data.quantity?.increment != null) {
          inv = { ...inv, quantity: inv.quantity + data.quantity.increment };
        }
        return { ...inv };
      },
      updateMany: async ({ where, data }) => {
        const needed = where?.quantity?.gte;
        if (!inv || inv.quantity < needed) return { count: 0 };
        inv = { ...inv, quantity: inv.quantity - data.quantity.decrement };
        return { count: 1 };
      },
    },
    inventoryMovement: {
      create: async ({ data }) => {
        movements.push(data);
        return data;
      },
    },
  };
}

describe('weightedAverageCost', () => {
  it('usa el costo entrante si no hay stock previo', () => {
    assert.equal(weightedAverageCost(0, null, 10, 5), 5);
    assert.equal(weightedAverageCost(0, 3, 10, 8), 8);
  });

  it('calcula promedio ponderado con stock y costo previos', () => {
    // 10 uds @ 100 + 10 uds @ 200 = 20 uds @ 150
    assert.equal(weightedAverageCost(10, 100, 10, 200), 150);
  });

  it('rechaza costos inválidos', () => {
    assert.equal(weightedAverageCost(5, 10, 2, -1), null);
    assert.equal(weightedAverageCost(5, 10, 2, Number.NaN), null);
  });
});

describe('changeStockAtomic', () => {
  it('incrementa stock y registra movimiento de compra', async () => {
    const tx = createMockTx({ inventory: { productId: 1, quantity: 4 } });
    await changeStockAtomic(tx, {
      productId: 1,
      quantityChange: 6,
      movementType: 'purchase',
      notes: 'compra #1',
    });
    assert.equal(tx.inventoryState.quantity, 10);
    assert.equal(tx.movements.length, 1);
    assert.equal(tx.movements[0].quantityChange, 6);
    assert.equal(tx.movements[0].movementType, 'purchase');
  });

  it('crea inventario si no existe al incrementar', async () => {
    const tx = createMockTx({ inventory: null });
    await changeStockAtomic(tx, {
      productId: 7,
      quantityChange: 3,
      movementType: 'purchase',
    });
    assert.equal(tx.inventoryState.productId, 7);
    assert.equal(tx.inventoryState.quantity, 3);
  });

  it('decrementa stock en venta cuando hay cantidad suficiente', async () => {
    const tx = createMockTx({ inventory: { productId: 1, quantity: 5 } });
    await changeStockAtomic(tx, {
      productId: 1,
      quantityChange: -2,
      movementType: 'sale',
    });
    assert.equal(tx.inventoryState.quantity, 3);
    assert.equal(tx.movements[0].movementType, 'sale');
  });

  it('falla con 400 si no hay stock suficiente', async () => {
    const tx = createMockTx({ inventory: { productId: 1, quantity: 1 } });
    await assert.rejects(
      () =>
        changeStockAtomic(tx, {
          productId: 1,
          quantityChange: -5,
          movementType: 'sale',
          insufficientMessage: 'Stock insuficiente para registrar esta venta.',
        }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Stock insuficiente/);
        return true;
      }
    );
    assert.equal(tx.inventoryState.quantity, 1);
    assert.equal(tx.movements.length, 0);
  });

  it('valida producto activo cuando se solicita', async () => {
    const tx = createMockTx({
      inventory: { productId: 1, quantity: 2 },
      product: { id: 1, isActive: false },
    });
    await assert.rejects(
      () =>
        changeStockAtomic(tx, {
          productId: 1,
          quantityChange: 1,
          validateActiveProduct: true,
        }),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /inactivo/);
        return true;
      }
    );
  });

  it('rechaza quantityChange = 0', async () => {
    const tx = createMockTx();
    await assert.rejects(
      () => changeStockAtomic(tx, { productId: 1, quantityChange: 0 }),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });
});
