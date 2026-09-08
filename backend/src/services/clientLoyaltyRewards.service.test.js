import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * `clientLoyaltyRewards.service.js` recibe su cliente Prisma vía el parámetro
 * `{ prisma: db }` en `getPendingLoyaltyRewards`/`markLoyaltyRewardsRedeemed`
 * (para poder pasar el `tx` de una transacción), así que se puede probar con un
 * mock simple sin tocar `grantLoyaltyRewardsIfEligible` (que sí importa el
 * cliente real por defecto y necesita `prisma.appointment.count`, cubierto por
 * separado en los tests de integración de citas/pagos).
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

const { getPendingLoyaltyRewards, markLoyaltyRewardsRedeemed } = await import(
  './clientLoyaltyRewards.service.js'
);

describe('getPendingLoyaltyRewards', () => {
  it('devuelve las líneas de regalo de una recompensa sin canjear', async () => {
    const db = buildFakeDb({
      rewards: [{ id: 1, clientId: 100, milestoneKey: 'every_5_mascarilla', redeemedAt: null }],
    });
    const pending = await getPendingLoyaltyRewards(100, { prisma: db });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, 1);
    assert.equal(pending[0].rewardLines.length, 1);
    assert.match(pending[0].rewardLines[0].description, /Mascarilla/);
  });

  it('devuelve ambos hitos si hay dos pendientes (5 y 10)', async () => {
    const db = buildFakeDb({
      rewards: [
        { id: 1, clientId: 100, milestoneKey: 'every_5_mascarilla', redeemedAt: null },
        { id: 2, clientId: 100, milestoneKey: 'every_10_cerveza_depilacion', redeemedAt: null },
      ],
    });
    const pending = await getPendingLoyaltyRewards(100, { prisma: db });
    assert.equal(pending.length, 2);
    const cerveza = pending.find((p) => p.milestoneKey === 'every_10_cerveza_depilacion');
    assert.equal(cerveza.rewardLines.length, 2);
  });

  it('no devuelve nada si no hay recompensas pendientes', async () => {
    const db = buildFakeDb({ rewards: [] });
    const pending = await getPendingLoyaltyRewards(100, { prisma: db });
    assert.equal(pending.length, 0);
  });

  it('ignora una fila cuya milestoneKey ya no existe en el código', async () => {
    const db = buildFakeDb({
      rewards: [{ id: 9, clientId: 100, milestoneKey: 'hito_retirado', redeemedAt: null }],
    });
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
