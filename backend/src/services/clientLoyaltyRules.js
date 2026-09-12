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
 * Resumen de la audiencia del programa de fidelización a partir de una fila
 * por cliente con servicios completados.
 *
 * Se define aquí, en el módulo puro, para que las tres cifras que muestra la
 * pantalla tengan una definición escrita y probada en vez de quedar
 * escondidas dentro de una consulta:
 *
 * - **En programa**: clientes con al menos un servicio completado. Todo el
 *   que completa un servicio ya está acumulando para el próximo hito, así que
 *   ese es el universo real del programa.
 * - **Nuevos del mes**: clientes cuyo PRIMER servicio completado cae dentro
 *   del mes de referencia.
 * - **Tasa de retorno**: proporción de los clientes en programa que volvieron
 *   al menos una segunda vez (2+ servicios completados). No es una métrica
 *   inventada: es recurrencia observada, que es lo que el programa busca.
 *
 * @param {Array<{ completedCount: number, firstCompletedAt?: Date|string|null }>} rows
 * @param {{ monthStart: Date, monthEnd: Date }} period Rango [inicio, fin) del mes de referencia.
 */
export function summarizeLoyaltyAudience(rows, { monthStart, monthEnd } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const clientsInProgram = list.length;
  const recurringClients = list.filter((row) => Number(row?.completedCount) >= 2).length;

  let newThisMonth = 0;
  if (monthStart && monthEnd) {
    const from = new Date(monthStart).getTime();
    const to = new Date(monthEnd).getTime();
    newThisMonth = list.filter((row) => {
      if (!row?.firstCompletedAt) return false;
      const at = new Date(row.firstCompletedAt).getTime();
      return Number.isFinite(at) && at >= from && at < to;
    }).length;
  }

  return {
    clientsInProgram,
    recurringClients,
    newThisMonth,
    // Redondeada a un decimal, como se muestra; sin clientes no hay tasa (null,
    // no 0: "0%" afirmaría que nadie vuelve, y lo cierto es que no hay dato).
    returnRate: clientsInProgram ? Math.round((recurringClients / clientsInProgram) * 1000) / 10 : null,
  };
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
