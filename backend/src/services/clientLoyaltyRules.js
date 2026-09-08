/**
 * Reglas puras de fidelización: qué hitos se cumplen a un conteo dado.
 *
 * Módulo puro (no toca Prisma ni red) para que se pueda probar entero, igual
 * que `appointmentLimitRules.js`. A diferencia de la primera versión, las
 * reglas ya NO están hardcodeadas aquí — las trae quien llame a
 * `milestonesReachedAt`, leídas de `LoyaltyMilestoneRule` (ver
 * `clientLoyaltyRewards.service.js`). Este archivo solo sabe hacer la cuenta:
 * "¿qué reglas se cumplen exactamente en este conteo?".
 */

/**
 * ¿Qué reglas se cumplen EXACTAMENTE en este conteo de servicios completados?
 *
 * Solo el múltiplo exacto dispara el hito (no "cada 5 o más"): quien llama a
 * esta función lo hace una vez por cada cita que se completa, así que el
 * conteo solo puede subir de a uno y nunca se salta un múltiplo. Un mismo
 * conteo puede cumplir varias reglas a la vez (ej. 10 cumple "cada 5" y
 * "cada 10").
 *
 * @param {number} completedCount
 * @param {Array<{ id: number, everyCount: number }>} rules Reglas activas.
 * @returns {Array<{ id: number, everyCount: number, occurrence: number }>}
 */
export function milestonesReachedAt(completedCount, rules) {
  if (!Number.isFinite(completedCount) || completedCount <= 0) return [];
  if (!Array.isArray(rules) || !rules.length) return [];
  return rules
    .filter((rule) => rule.everyCount > 0 && completedCount % rule.everyCount === 0)
    .map((rule) => ({ ...rule, occurrence: completedCount / rule.everyCount }));
}

/**
 * La próxima regla que el cliente alcanzará y cuántos servicios le faltan.
 *
 * @param {number} completedCount
 * @param {Array<{ id: number, everyCount: number }>} rules Reglas activas.
 * @returns {{ rule: { id: number, everyCount: number }, remaining: number } | null}
 */
export function nextMilestone(completedCount, rules) {
  if (!Array.isArray(rules) || !rules.length) return null;
  const count = Number.isFinite(completedCount) && completedCount > 0 ? completedCount : 0;
  let best = null;
  for (const rule of rules) {
    if (!(rule.everyCount > 0)) continue;
    const remainder = count % rule.everyCount;
    const remaining = remainder === 0 ? rule.everyCount : rule.everyCount - remainder;
    if (!best || remaining < best.remaining) {
      best = { rule, remaining };
    }
  }
  return best;
}
