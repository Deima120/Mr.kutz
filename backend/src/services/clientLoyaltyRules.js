/**
 * Reglas de fidelización: qué hitos existen y cuáles se cumplen a un conteo dado.
 *
 * Módulo puro (no toca Prisma ni red) para que se pueda probar entero, igual que
 * `appointmentLimitRules.js`. Agregar un hito nuevo en el futuro es añadir un
 * objeto a `LOYALTY_MILESTONES`, sin tocar quien lo consume.
 *
 * Cada hito se repite cíclicamente: `every: 5` se cumple en 5, 10, 15, 20...
 * (así que en un múltiplo de 10 se cumplen a la vez el de 5 y el de 10).
 * `rewardLines` es una lista (no un solo premio) porque un hito puede entregar
 * más de un regalo a la vez; cada línea se vuelve una línea `manual` de $0
 * independiente en el cobro, trazable por separado en el recibo.
 */

export const LOYALTY_MILESTONES = [
  {
    key: 'every_5_mascarilla',
    every: 5,
    rewardLines: [{ description: 'Mascarilla gratis — fidelización (cada 5 servicios)' }],
  },
  {
    key: 'every_10_cerveza_depilacion',
    every: 10,
    rewardLines: [
      { description: 'Cerveza gratis — fidelización (cada 10 servicios)' },
      { description: 'Depilación gratis — fidelización (cada 10 servicios)' },
    ],
  },
];

const MILESTONES_BY_KEY = new Map(LOYALTY_MILESTONES.map((m) => [m.key, m]));

/**
 * @param {string} key
 * @returns {{key: string, every: number, rewardLines: Array<{description: string}>} | undefined}
 */
export function getMilestoneByKey(key) {
  return MILESTONES_BY_KEY.get(key);
}

/**
 * ¿Qué hitos se cumplen EXACTAMENTE en este conteo de servicios completados?
 *
 * Solo el múltiplo exacto dispara el hito (no "cada 5 o más"): quien llama a
 * esta función lo hace una vez por cada cita que se completa, así que el
 * conteo solo puede subir de a uno y nunca se salta un múltiplo.
 *
 * @param {number} completedCount
 * @returns {Array<{key: string, every: number, occurrence: number, rewardLines: Array<{description: string}>}>}
 */
export function milestonesReachedAt(completedCount) {
  if (!Number.isFinite(completedCount) || completedCount <= 0) return [];
  return LOYALTY_MILESTONES.filter((m) => completedCount % m.every === 0).map((m) => ({
    ...m,
    occurrence: completedCount / m.every,
  }));
}
