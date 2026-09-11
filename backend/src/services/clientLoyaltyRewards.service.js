/**
 * Fidelización: reglas configurables (`LoyaltyMilestoneRule`), sus opciones de
 * premio (`LoyaltyMilestoneRewardOption`, el cliente elige una cuando el hito
 * tiene varias), otorgamiento automático, elección, canje y consulta
 * (historial + progreso por cliente).
 *
 * Separado de `clientLoyaltyRules.js` (cálculo puro, sin Prisma) porque este
 * archivo sí toca la base de datos.
 */

import prisma from '../lib/prisma.js';
import { milestonesReachedAt, nextMilestone } from './clientLoyaltyRules.js';

/** Código de error de Postgres para violación de restricción única. */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

const REWARD_ITEM_INCLUDE = { service: true, product: true };
const RULE_WITH_OPTIONS_INCLUDE = { options: { include: { items: { include: REWARD_ITEM_INCLUDE } } } };

function describeRewardItem(rewardItem) {
  if (rewardItem.itemType === 'product') {
    return rewardItem.product?.name || 'Producto';
  }
  return rewardItem.service?.name || 'Servicio';
}

function httpError(message, statusCode = 400, reason) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  return err;
}

// ---------------------------------------------------------------------------
// Reglas y sus opciones (configuración del admin)
// ---------------------------------------------------------------------------

/**
 * @param {{ activeOnly?: boolean }} [options]
 */
export async function listMilestoneRules({ activeOnly = false } = {}) {
  const rules = await prisma.loyaltyMilestoneRule.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: RULE_WITH_OPTIONS_INCLUDE,
    orderBy: { everyCount: 'asc' },
  });
  return rules;
}

function validateRewardItemsInput(items) {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('Indica al menos un premio (servicio o producto) para esta opción.');
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
 * Un hito necesita al menos una opción de premio; cada opción, al menos un
 * ítem. Una opción puede agrupar varios ítems (ej. "Barba + Cejas y una
 * cerveza" es UNA opción con dos ítems, no dos opciones).
 */
function validateRewardOptionsInput(options) {
  if (!Array.isArray(options) || !options.length) {
    const err = new Error('Indica al menos una opción de premio para este hito.');
    err.statusCode = 400;
    throw err;
  }
  return options.map((option) => ({ items: validateRewardItemsInput(option?.items) }));
}

/**
 * @param {{ everyCount: number, label: string, options: Array<{ items: Array<object> }> }} data
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
  const options = validateRewardOptionsInput(data.options);

  try {
    return await prisma.loyaltyMilestoneRule.create({
      data: {
        everyCount,
        label,
        options: {
          create: options.map((option) => ({ items: { create: option.items } })),
        },
      },
      include: RULE_WITH_OPTIONS_INCLUDE,
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
 * Reemplaza label/everyCount/opciones de una regla existente. Las opciones se
 * reescriben completas (borrar + recrear, cascada hasta sus ítems) porque no
 * tienen identidad propia fuera de su regla — las recompensas YA otorgadas no
 * se tocan: guardan su propio snapshot en `ClientLoyaltyRewardItem`,
 * independiente de esto, y `ClientLoyaltyReward.chosenOptionId` de una
 * recompensa ya elegida queda apuntando a una opción que puede desaparecer
 * (`onDelete: SetNull` — se vuelve `null`, pero el snapshot ya hecho no se
 * pierde).
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
  const options = data.options != null ? validateRewardOptionsInput(data.options) : null;
  const isActive = data.isActive != null ? Boolean(data.isActive) : existing.isActive;

  try {
    return await prisma.$transaction(async (tx) => {
      if (options) {
        await tx.loyaltyMilestoneRewardOption.deleteMany({ where: { ruleId } });
      }
      return tx.loyaltyMilestoneRule.update({
        where: { id: ruleId },
        data: {
          everyCount,
          label,
          isActive,
          ...(options
            ? { options: { create: options.map((option) => ({ items: { create: option.items } })) } }
            : {}),
        },
        include: RULE_WITH_OPTIONS_INCLUDE,
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
// Otorgamiento automático y elección de opción
// ---------------------------------------------------------------------------

/** Crea los `ClientLoyaltyRewardItem` (snapshot) de una opción para un premio. */
function rewardItemSnapshotData(optionItems) {
  return optionItems.map((item) => ({
    itemType: item.itemType,
    serviceId: item.serviceId,
    productId: item.productId,
    quantity: item.quantity,
    description: describeRewardItem(item).slice(0, 200),
  }));
}

/**
 * Cuenta las citas completadas del cliente y otorga cualquier hito activo que
 * se cumpla exactamente en ese conteo. Si la regla tiene una sola opción de
 * premio, se auto-elige y se snapshotea de inmediato — igual que antes de que
 * existiera la elección. Si tiene varias, el premio queda otorgado pero
 * "pendiente de elegir" (`chosenOptionId: null`, sin ítems todavía) hasta que
 * el cliente —o el staff en su nombre— elige con `chooseLoyaltyRewardOption`.
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
    if (!full || !full.options.length) continue; // sin opciones configuradas, nada que otorgar

    const autoOption = full.options.length === 1 ? full.options[0] : null;

    try {
      await prisma.clientLoyaltyReward.create({
        data: {
          clientId,
          ruleId: rule.id,
          occurrence: rule.occurrence,
          grantedAtCount: completedCount,
          ...(autoOption
            ? {
                chosenOptionId: autoOption.id,
                items: { create: rewardItemSnapshotData(autoOption.items) },
              }
            : {}),
        },
      });
    } catch (err) {
      if (err?.code !== PRISMA_UNIQUE_VIOLATION) throw err;
      // Ya se había otorgado este hito (llamada duplicada) — nada que hacer.
    }
  }
}

/**
 * El cliente (o el staff en su nombre) elige entre las opciones de un premio
 * ya otorgado pero aún sin elegir. Crea el snapshot de esa opción y fija
 * `chosenOptionId` — a partir de ahí se canjea solo, igual que un premio de
 * una sola opción.
 *
 * @param {number} rewardId
 * @param {number} optionId
 * @param {number} clientId Dueño esperado del premio — quien llama ya resolvió
 *   esto (el propio cliente vía `req.user.client_id`, o el admin vía la ficha
 *   del cliente que está atendiendo). Sirve de comprobación, no de fuente.
 */
/**
 * Validación pura (sin Prisma) de una elección de opción — separada para
 * poder probarla con objetos simples, igual que `assertNoPrivilegeEscalation`
 * en `role.service.js`. Devuelve la opción elegida si todo está en regla.
 *
 * @param {object} reward Premio con `rule.options` ya incluidos.
 * @param {number} optionId
 * @param {number} clientId Dueño esperado.
 */
export function assertCanChooseRewardOption(reward, optionId, clientId) {
  if (!reward) throw httpError('Recompensa no encontrada.', 404);
  if (reward.clientId !== Number(clientId)) {
    throw httpError('Esta recompensa no pertenece a ese cliente.', 403);
  }
  if (reward.chosenOptionId != null) {
    throw httpError('Ya se eligió el premio de este hito.', 409, 'ALREADY_CHOSEN');
  }
  const option = reward.rule.options.find((o) => o.id === Number(optionId));
  if (!option) {
    throw httpError('Esa opción no pertenece a este hito.', 400);
  }
  return option;
}

export async function chooseLoyaltyRewardOption(rewardId, optionId, clientId) {
  const id = parseInt(rewardId, 10);
  const chosenOptionId = parseInt(optionId, 10);

  const reward = await prisma.clientLoyaltyReward.findUnique({
    where: { id },
    include: { rule: { include: { options: { include: { items: { include: REWARD_ITEM_INCLUDE } } } } } },
  });
  const option = assertCanChooseRewardOption(reward, chosenOptionId, clientId);

  return prisma.$transaction(async (tx) => {
    await tx.clientLoyaltyRewardItem.createMany({ data: rewardItemSnapshotData(option.items).map((it) => ({ ...it, rewardId: id })) });
    return tx.clientLoyaltyReward.update({
      where: { id },
      data: { chosenOptionId },
      include: { items: true },
    });
  });
}

// ---------------------------------------------------------------------------
// Canje (usado por payment.service.js)
// ---------------------------------------------------------------------------

/**
 * Recompensas del cliente listas para canjear (ya elegidas, sin canjear
 * todavía), con sus ítems ya resueltos. Una recompensa otorgada pero aún sin
 * elegir opción no aparece aquí — no hay nada que aplicar todavía.
 *
 * @param {number} clientId
 * @param {{ prisma?: object }} [options] Cliente Prisma o `tx` de una transacción.
 */
export async function getPendingLoyaltyRewards(clientId, { prisma: db = prisma } = {}) {
  return db.clientLoyaltyReward.findMany({
    where: { clientId, redeemedAt: null, chosenOptionId: { not: null } },
    include: { items: true },
  });
}

/**
 * Recompensas del cliente otorgadas pero **sin elegir opción todavía**, con
 * las opciones disponibles de su hito ya resueltas (descripciones incluidas)
 * para que el formulario de agendar (o la pantalla de fidelización del
 * cliente) pueda ofrecerlas.
 *
 * @param {number} clientId
 */
export async function getPendingRewardChoices(clientId) {
  const rewards = await prisma.clientLoyaltyReward.findMany({
    where: { clientId, chosenOptionId: null },
    include: {
      rule: { include: { options: { include: { items: { include: REWARD_ITEM_INCLUDE } } } } },
    },
    orderBy: { grantedAt: 'asc' },
  });
  return rewards.map((r) => ({
    id: r.id,
    ruleId: r.ruleId,
    ruleLabel: r.rule.label,
    grantedAt: r.grantedAt,
    options: r.rule.options.map((option) => ({
      id: option.id,
      items: option.items.map((item) => ({
        itemType: item.itemType,
        serviceId: item.serviceId,
        productId: item.productId,
        quantity: item.quantity,
        description: describeRewardItem(item),
      })),
    })),
  }));
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
