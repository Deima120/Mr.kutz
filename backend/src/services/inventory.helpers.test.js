/**
 * Tests del núcleo de inventario (sin BD real).
 * Ejecutar: npm test (desde backend)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertManualMovement,
  changeStockAtomic,
  reverseMovementAtomic,
  runSerializable,
  weightedAverageCost,
} from './inventory.helpers.js';

function createMockTx({
  inventory = null,
  product = { id: 1, isActive: true },
} = {}) {
  let inv = inventory ? { ...inventory } : null;
  const movements = [];
  const voidedMovementIds = new Set();

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
      upsert: async ({ create }) => {
        if (!inv) inv = { productId: create.productId, quantity: create.quantity ?? 0 };
        return { ...inv };
      },
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
        const created = { id: movements.length + 100, ...data };
        movements.push(created);
        return created;
      },
      findUnique: async ({ where }) =>
        movements.find(
          (movement) => movement.reversalOfMovementId === where.reversalOfMovementId
        ) || null,
      updateMany: async ({ where }) => {
        if (voidedMovementIds.has(where.id)) return { count: 0 };
        voidedMovementIds.add(where.id);
        return { count: 1 };
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
    assert.equal(weightedAverageCost(5, 10, 2, 0), null);
    assert.equal(weightedAverageCost(5, 10, 2, Number.NaN), null);
  });
});

describe('assertManualMovement', () => {
  it('permite ajustes positivos o negativos y daños negativos', () => {
    assert.doesNotThrow(() => assertManualMovement(2, 'adjustment'));
    assert.doesNotThrow(() => assertManualMovement(-2, 'adjustment'));
    assert.doesNotThrow(() => assertManualMovement(-1, 'damage'));
  });

  it('rechaza tipos de sistema y daños positivos', () => {
    assert.throws(() => assertManualMovement(1, 'purchase'), /adjustment o damage/);
    assert.throws(() => assertManualMovement(1, 'damage'), /disminuir/);
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

describe('reverseMovementAtomic', () => {
  it('crea un solo reverso y es idempotente por reversalOfMovementId', async () => {
    const tx = createMockTx({ inventory: { productId: 1, quantity: 5 } });
    const original = {
      id: 42,
      productId: 1,
      quantityChange: -2,
      voidedAt: null,
    };
    const first = await reverseMovementAtomic(tx, original, { voidReason: 'error' });
    const second = await reverseMovementAtomic(tx, original, { voidReason: 'error' });

    assert.equal(first.id, second.id);
    assert.equal(tx.inventoryState.quantity, 7);
    assert.equal(tx.movements.length, 1);
    assert.equal(tx.movements[0].reversalOfMovementId, 42);
  });
});

describe('runSerializable', () => {
  it('reintenta conflictos serializables y conserva el resultado final', async () => {
    let attempts = 0;
    const client = {
      $transaction: async (operation) => {
        attempts += 1;
        if (attempts < 3) {
          const error = new Error('write conflict');
          error.code = 'P2034';
          throw error;
        }
        return operation({});
      },
    };

    const result = await runSerializable(client, async () => 'ok');
    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
  });

  it('no reintenta errores que no son conflictos de concurrencia', async () => {
    let attempts = 0;
    const client = {
      $transaction: async () => {
        attempts += 1;
        const error = new Error('validation failed');
        error.code = 'P2003';
        throw error;
      },
    };

    await assert.rejects(() => runSerializable(client, async () => 'never'), /validation failed/);
    assert.equal(attempts, 1);
  });
});
