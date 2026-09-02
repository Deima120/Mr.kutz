/**
 * Tope de citas pendientes por cliente.
 *
 * Espejo de `backend/src/services/appointmentLimitRules.js`, que es la regla real:
 * esto solo sirve para avisar antes de que el cliente pierda tiempo llenando el
 * formulario. Se replica igual que ya se hace con el máximo de servicios por cita.
 */

export const MAX_PENDING_APPOINTMENTS_PER_CLIENT = 3;

/** Estados que ocupan cupo mientras la cita no haya empezado. */
export const PENDING_STATUSES = 'scheduled,confirmed';

export function pendingLimitMessage(limit = MAX_PENDING_APPOINTMENTS_PER_CLIENT) {
  return `Ya tienes ${limit} citas pendientes, que es el máximo permitido. Cuando asistas a una de ellas (o la canceles) podrás agendar otra.`;
}
