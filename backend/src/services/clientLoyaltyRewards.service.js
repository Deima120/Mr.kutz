/**
 * Fidelización: reglas configurables (`LoyaltyMilestoneRule`), otorgamiento
 * automático de premios, canje y consulta (historial + progreso por cliente).
 *
 * Separado de `clientLoyaltyRules.js` (cálculo puro, sin Prisma) porque este
 * archivo sí toca la base de datos.
 */

import prisma from '../lib/prisma.js';
import { milestonesReachedAt, nextMilestone } from './clientLoyaltyRules.js';

/** Código de error de Postgres para violación de restricción única. */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

const REWARD_ITEM_INCLUDE = { service: true, product: true };

function describeRewardItem(rewardItem) {
  if (rewardItem.itemType === 'product') {
    return rewardItem.product?.name || 'Producto';
  }
  return rewardItem.service?.name || 'Servicio';
}

// ---------------------------------------------------------------------------
// Reglas (configuración del admin)
// ---------------------------------------------------------------------------

/**
 * @param {{ activeOnly?: boolean }} [options]
 */
export async function listMilestoneRules({ activeOnly = false } = {}) {
  const rules = await prisma.loyaltyMilestoneRule.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { rewardItems: { include: REWARD_ITEM_INCLUDE } },
    orderBy: { everyCount: 'asc' },
  });
  return rules;
}

function validateRewardItemsInput(items) {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('Indica al menos un premio (servicio o producto) para este hito.');
    err.statusCode = 400;
    throw err;
  }
  return items.map((item) => {
    const itemType = item.itemType === 'product' ? 'product' : 'service';
    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? Math.trunc(item.quantity) : 1;
    const serviceId = itemType === 'service' ? parseInt(item.serviceId, 10) : null;
    const productId = itemType === 'product' ? parseInt(item.productId, 10) : null;
    if (itemType === 'service' && !(serviceId > 0)) {
      const err = new Error('Cada premio de tipo servicio necesita un servicio válido.');
      err.statusCode = 400;
      throw err;
    }
    if (itemType === 'product' && !(productId > 0)) {
      const err = new Error('Cada premio de tipo producto necesita un producto válido.');
      err.statusCode = 400;
      throw err;
    }
    return { itemType, serviceId, productId, quantity };
  });
}

/**
 * @param {{ everyCount: number, label: string, rewardItems: Array<object> }} data
 */
export async function createMilestoneRule(data) {
  const everyCount = parseInt(data.everyCount, 10);
  if (!Number.isFinite(everyCount) || everyCount <= 0) {
    const err = new Error('Indica cada cuántos servicios completados se otorga el hito.');
    err.statusCode = 400;
    throw err;
  }
  const label = String(data.label || '').trim();
  if (!label) {
    const err = new Error('Indica un nombre para el hito.');
    err.statusCode = 400;
    throw err;
  }
  const rewardItems = validateRewardItemsInput(data.rewardItems);

  try {
    return await prisma.loyaltyMilestoneRule.create({
      data: {
        everyCount,
        label,
        rewardItems: { create: rewardItems },
      },
      include: { rewardItems: { include: REWARD_ITEM_INCLUDE } },
    });
  } catch (err) {
    if (err?.code === PRISMA_UNIQUE_VIOLATION) {
      const dup = new Error(`Ya existe un hito configurado para cada ${everyCount} servicios.`);
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

/**
 * Reemplaza label/everyCount/premios de una regla existente. Los premios se
 * reescriben completos (borrar + recrear) porque no tienen identidad propia
 * fuera de su regla — las recompensas YA otorgadas no se tocan: guardan su
 * propio snapshot en `ClientLoyaltyRewardItem`, independiente de esto.
 */
export async function updateMilestoneRule(id, data) {
  const ruleId = parseInt(id, 10);
  const existing = await prisma.loyaltyMilestoneRule.findUnique({ where: { id: ruleId } });
  if (!existing) return null;

  const everyCount = data.everyCount != null ? parseInt(data.everyCount, 10) : existing.everyCount;
  if (!Number.isFinite(everyCount) || everyCount <= 0) {
    const err = new Error('Indica cada cuántos servicios completados se otorga el hito.');
    err.statusCode = 400;
    throw err;
  }
  const label = data.label != null ? String(data.label).trim() : existing.label;
  if (!label) {
    const err = new Error('Indica un nombre para el hito.');
    err.statusCode = 400;
    throw err;
  }
  const rewardItems = data.rewardItems != null ? validateRewardItemsInput(data.rewardItems) : null;
  const isActive = data.isActive != null ? Boolean(data.isActive) : existing.isActive;

  try {
    return await prisma.$transaction(async (tx) => {
      if (rewardItems) {
        await tx.loyaltyMilestoneRewardItem.deleteMany({ where: { ruleId } });
      }
      return tx.loyaltyMilestoneRule.update({
        where: { id: ruleId },
        data: {
          everyCount,
          label,
          isActive,
          ...(rewardItems ? { rewardItems: { create: rewardItems } } : {}),
        },
        include: { rewardItems: { include: REWARD_ITEM_INCLUDE } },
      });
    });
  } catch (err) {
    if (err?.code === PRISMA_UNIQUE_VIOLATION) {
      const dup = new Error(`Ya existe un hito configurado para cada ${everyCount} servicios.`);
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

/**
 * No se borra físicamente: una regla ya puede tener hitos otorgados
 * (`ClientLoyaltyReward.ruleId` es `onDelete: Restrict`), y borrarla rompería
 * ese historial. Se desactiva, igual que servicios/productos inactivos.
 */
export async function deactivateMilestoneRule(id) {
  const ruleId = parseInt(id, 10);
  const existing = await prisma.loyaltyMilestoneRule.findUnique({ where: { id: ruleId } });
  if (!existing) return null;
  return prisma.loyaltyMilestoneRule.update({ where: { id: ruleId }, data: { isActive: false } });
}

// ---------------------------------------------------------------------------
// Otorgamiento automático
// ---------------------------------------------------------------------------

/**
 * Cuenta las citas completadas del cliente y otorga cualquier hito activo que
 * se cumpla exactamente en ese conteo.
 *
 * Se llama justo después de que una cita pasa a `completed` (hay dos puntos de
 * llamada en `appointment.service.js`). La restricción `@@unique([clientId,
 * ruleId, occurrence])` es la salvaguarda de idempotencia: si esta función se
 * invoca dos veces para la misma cita, el segundo intento de crear la misma
 * fila choca contra esa restricción (P2002) y se ignora en silencio.
 *
 * @param {number} clientId
 * @returns {Promise<void>}
 */
export async function grantLoyaltyRewardsIfEligible(clientId) {
  const completedCount = await prisma.appointment.count({
    where: { clientId, status: 'completed' },
  });
  const rules = await listMilestoneRules({ activeOnly: true });
  const reached = milestonesReachedAt(completedCount, rules);
  if (!reached.length) return;

  for (const rule of reached) {
    const full = rules.find((r) => r.id === rule.id);
    if (!full) continue;
    try {
      await prisma.clientLoyaltyReward.create({
        data: {
          clientId,
          ruleId: rule.id,
          occurrence: rule.occurrence,
          grantedAtCount: completedCount,
          items: {
            create: full.rewardItems.map((item) => ({
              itemType: item.itemType,
              serviceId: item.serviceId,
              productId: item.productId,
              quantity: item.quantity,
              description: describeRewardItem(item).slice(0, 200),
            })),
          },
        },
      });
    } catch (err) {
      if (err?.code !== PRISMA_UNIQUE_VIOLATION) throw err;
      // Ya se había otorgado este hito (llamada duplicada) — nada que hacer.
    }
  }
}

// ---------------------------------------------------------------------------
// Canje (usado por payment.service.js)
// ---------------------------------------------------------------------------

/**
 * Recompensas del cliente aún sin canjear, con sus ítems ya resueltos.
 *
 * @param {number} clientId
 * @param {{ prisma?: object }} [options] Cliente Prisma o `tx` de una transacción.
 */
export async function getPendingLoyaltyRewards(clientId, { prisma: db = prisma } = {}) {
  return db.clientLoyaltyReward.findMany({
    where: { clientId, redeemedAt: null },
    include: { items: true },
  });
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

// ---------------------------------------------------------------------------
// Historial e progreso (consulta)
// ---------------------------------------------------------------------------

/**
 * Historial paginado de recompensas otorgadas, para la pantalla admin.
 * Nunca carga todo de una vez: siempre `take`/`skip` + `count()` aparte, igual
 * que el resto de listados paginados del panel (`client.service.js getAll`).
 *
 * @param {{ limit?: number, offset?: number, clientId?: number, status?: 'pending'|'redeemed' }} params
 */
export async function listLoyaltyRewardsHistory({ limit = 10, offset = 0, clientId, status } = {}) {
  const where = {
    ...(clientId ? { clientId } : {}),
    ...(status === 'pending' ? { redeemedAt: null } : {}),
    ...(status === 'redeemed' ? { redeemedAt: { not: null } } : {}),
  };
  const [rewards, total] = await Promise.all([
    prisma.clientLoyaltyReward.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        rule: { select: { id: true, everyCount: true, label: true } },
        items: true,
      },
      orderBy: { grantedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.clientLoyaltyReward.count({ where }),
  ]);
  return { rewards, total, limit, offset };
}

/**
 * Avance de un cliente: cuántas citas agendadas/completadas/pagadas tiene, y
 * cuánto le falta para el próximo hito.
 *
 * @param {number} clientId
 */
export async function getClientLoyaltyProgress(clientId) {
  const [scheduledCount, completedCount, paidCount, rules] = await Promise.all([
    prisma.appointment.count({ where: { clientId } }),
    prisma.appointment.count({ where: { clientId, status: 'completed' } }),
    prisma.paymentLine.count({
      where: { lineType: 'service', voidedAt: null, appointment: { clientId } },
    }),
    listMilestoneRules({ activeOnly: true }),
  ]);

  const next = nextMilestone(completedCount, rules);
  return {
    scheduledCount,
    completedCount,
    paidCount,
    nextMilestone: next
      ? { everyCount: next.rule.everyCount, remaining: next.remaining, label: next.rule.label }
      : null,
  };
}
