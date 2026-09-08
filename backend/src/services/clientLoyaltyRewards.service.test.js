import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * `getPendingLoyaltyRewards`/`markLoyaltyRewardsRedeemed` reciben su cliente
 * Prisma vía el parámetro `{ prisma: db }` (para poder pasar el `tx` de una
 * transacción), así que se pueden probar con un mock simple. Las funciones de
 * configuración (`createMilestoneRule`/`updateMilestoneRule`) usan el cliente
 * real por defecto — aquí solo se cubre su validación de entrada, que corre
 * ANTES de tocar la base de datos, sin necesidad de mockear Prisma.
 * `grantLoyaltyRewardsIfEligible`, `listLoyaltyRewardsHistory` y
 * `getClientLoyaltyProgress` no tienen test dedicado por la misma razón que el
 * resto de `appointment.service.js`/`payment.service.js`: dependen fuertemente
 * de Prisma real y no hay infraestructura de tests de integración en este
 * repo (ver `private/backend/CLAUDE.md`).
 */

function buildFakeDb({ rewards = [] } = {}) {
  const updated = [];
  return {
    clientLoyaltyReward: {
      findMany: async ({ where }) =>
        rewards.filter((r) => r.clientId === where.clientId && r.redeemedAt === where.redeemedAt),
      updateMany: async ({ where, data }) => {
        updated.push({ ids: where.id.in, data });
        return { count: where.id.in.length };
      },
    },
    _updated: updated,
  };
}

const { getPendingLoyaltyRewards, markLoyaltyRewardsRedeemed, createMilestoneRule } = await import(
  './clientLoyaltyRewards.service.js'
);

describe('getPendingLoyaltyRewards', () => {
  it('devuelve una recompensa sin canjear con sus items', async () => {
    const db = buildFakeDb({
      rewards: [
        {
          id: 1,
          clientId: 100,
          redeemedAt: null,
          items: [{ id: 9, itemType: 'service', description: 'Mascarilla facial' }],
        },
      ],
    });
    const pending = await getPendingLoyaltyRewards(100, { prisma: db });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].items[0].description, 'Mascarilla facial');
  });

  it('no devuelve nada si no hay recompensas pendientes', async () => {
    const db = buildFakeDb({ rewards: [] });
    const pending = await getPendingLoyaltyRewards(100, { prisma: db });
    assert.equal(pending.length, 0);
  });
});

describe('markLoyaltyRewardsRedeemed', () => {
  it('marca las recompensas dadas con el paymentId', async () => {
    const db = buildFakeDb();
    await markLoyaltyRewardsRedeemed([1, 2], 55, { prisma: db });
    assert.equal(db._updated.length, 1);
    assert.deepEqual(db._updated[0].ids, [1, 2]);
    assert.equal(db._updated[0].data.paymentId, 55);
    assert.ok(db._updated[0].data.redeemedAt instanceof Date);
  });

  it('no llama a la base de datos con una lista vacía', async () => {
    const db = buildFakeDb();
    await markLoyaltyRewardsRedeemed([], 55, { prisma: db });
    assert.equal(db._updated.length, 0);
  });
});

describe('createMilestoneRule — validación (no toca la base de datos)', () => {
  it('rechaza sin everyCount válido', async () => {
    await assert.rejects(
      () => createMilestoneRule({ label: 'x', rewardItems: [{ itemType: 'service', serviceId: 1 }] }),
      { statusCode: 400 }
    );
  });

  it('rechaza sin label', async () => {
    await assert.rejects(
      () => createMilestoneRule({ everyCount: 5, rewardItems: [{ itemType: 'service', serviceId: 1 }] }),
      { statusCode: 400 }
    );
  });

  it('rechaza sin ítems de premio', async () => {
    await assert.rejects(
      () => createMilestoneRule({ everyCount: 5, label: 'Cada 5', rewardItems: [] }),
      { statusCode: 400 }
    );
  });

  it('rechaza un ítem de servicio sin serviceId', async () => {
    await assert.rejects(
      () => createMilestoneRule({ everyCount: 5, label: 'Cada 5', rewardItems: [{ itemType: 'service' }] }),
      { statusCode: 400 }
    );
  });

  it('rechaza un ítem de producto sin productId', async () => {
    await assert.rejects(
      () => createMilestoneRule({ everyCount: 5, label: 'Cada 5', rewardItems: [{ itemType: 'product' }] }),
      { statusCode: 400 }
    );
  });
});
