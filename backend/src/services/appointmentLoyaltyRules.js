/**
 * Bloqueo de redundancia entre el premio de fidelización elegido al agendar y
 * los servicios de la propia cita.
 *
 * Regla: si el cliente eligió una opción cuyo premio es un servicio (ej.
 * "Barba" gratis), no puede además pagar ese mismo servicio en la misma cita
 * — ni de forma directa, ni escondido dentro de un combo que lo incluya de
 * verdad (`Service.comboComponents`, no por coincidencia de nombre). Módulo
 * puro (sin Prisma) para poder probarlo con objetos simples, igual que
 * `appointmentLimitRules.js`.
 */

/**
 * @param {Array<{ id: number, name: string, comboComponents?: Array<{ id: number }> }>} orderedServices
 * @param {Set<number>} rewardServiceIds Servicios que el premio elegido otorgaría gratis.
 * @returns {{ id: number, name: string } | null} El primer servicio de la cita
 *   que resulta redundante con el premio, o `null` si no hay ninguno.
 */
export function findRedundantLoyaltyService(orderedServices, rewardServiceIds) {
  if (!rewardServiceIds || !rewardServiceIds.size) return null;
  if (!Array.isArray(orderedServices)) return null;

  return (
    orderedServices.find(
      (svc) =>
        rewardServiceIds.has(svc.id) ||
        (svc.comboComponents ?? []).some((c) => rewardServiceIds.has(c.id)),
    ) ?? null
  );
}

/**
 * Códigos de servicio (`itemType: 'service'`, con `serviceId`) que una opción
 * de premio otorgaría gratis, como `Set` listo para `findRedundantLoyaltyService`.
 *
 * @param {Array<{ itemType: string, serviceId: number | null }>} optionItems
 */
export function rewardServiceIdsFromOption(optionItems) {
  return new Set(
    (optionItems ?? [])
      .filter((it) => it.itemType === 'service' && it.serviceId)
      .map((it) => it.serviceId),
  );
}
