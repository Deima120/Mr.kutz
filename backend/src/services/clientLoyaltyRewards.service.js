/**
 * Otorga y consulta hitos de fidelización de un cliente. Separado de
 * `clientLoyaltyRules.js` (reglas puras) porque este archivo sí toca Prisma.
 */

import prisma from '../lib/prisma.js';
import { milestonesReachedAt, getMilestoneByKey } from './clientLoyaltyRules.js';

/** Código de error de Postgres para violación de restricción única. */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * Cuenta las citas completadas del cliente y otorga cualquier hito de
 * `LOYALTY_MILESTONES` que se cumpla exactamente en ese conteo.
 *
 * Se llama justo después de que una cita pasa a `completed` (hay dos puntos de
 * llamada en `appointment.service.js`: la sincronización automática y el
 * `update()` manual). La restricción `@@unique([clientId, milestoneKey,
 * occurrence])` es la salvaguarda de idempotencia: si esta función se invoca
 * dos veces para la misma cita, el segundo intento de crear la misma fila
 * choca contra esa restricción (P2002) y se ignora en silencio, sin duplicar
 * el premio.
 *
 * @param {number} clientId
 * @returns {Promise<void>}
 */
export async function grantLoyaltyRewardsIfEligible(clientId) {
  const completedCount = await prisma.appointment.count({
    where: { clientId, status: 'completed' },
  });
  const reached = milestonesReachedAt(completedCount);
  if (!reached.length) return;

  for (const milestone of reached) {
    try {
      await prisma.clientLoyaltyReward.create({
        data: {
          clientId,
          milestoneKey: milestone.key,
          occurrence: milestone.occurrence,
          grantedAtCount: completedCount,
        },
      });
    } catch (err) {
      if (err?.code !== PRISMA_UNIQUE_VIOLATION) throw err;
      // Ya se había otorgado este hito (llamada duplicada) — nada que hacer.
    }
  }
}

/**
 * Recompensas del cliente aún sin canjear, con sus líneas de regalo ya
 * resueltas desde `LOYALTY_MILESTONES` (por si la regla cambia de nombre o
 * contenido después de otorgado el hito, se guarda solo la `milestoneKey` y
 * se re-deriva el texto en el momento de aplicarlo).
 *
 * @param {number} clientId
 * @param {{ prisma?: object }} [options] Cliente Prisma o `tx` de una transacción.
 * @returns {Promise<Array<{ id: number, milestoneKey: string, rewardLines: Array<{description: string}> }>>}
 */
export async function getPendingLoyaltyRewards(clientId, { prisma: db = prisma } = {}) {
  const pending = await db.clientLoyaltyReward.findMany({
    where: { clientId, redeemedAt: null },
    select: { id: true, milestoneKey: true },
  });
  return pending
    .map((r) => {
      const milestone = getMilestoneByKey(r.milestoneKey);
      if (!milestone) return null; // regla retirada del código: se ignora, no se cae
      return { id: r.id, milestoneKey: r.milestoneKey, rewardLines: milestone.rewardLines };
    })
    .filter(Boolean);
}

/**
 * Marca recompensas como canjeadas al asociarlas a un cobro.
 *
 * @param {number[]} rewardIds
 * @param {number} paymentId
 * @param {{ prisma?: object }} [options] Cliente Prisma o `tx` de una transacción.
 */
export async function markLoyaltyRewardsRedeemed(rewardIds, paymentId, { prisma: db = prisma } = {}) {
  if (!rewardIds.length) return;
  await db.clientLoyaltyReward.updateMany({
    where: { id: { in: rewardIds } },
    data: { redeemedAt: new Date(), paymentId },
  });
}
