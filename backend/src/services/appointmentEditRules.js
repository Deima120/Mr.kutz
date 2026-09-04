/**
 * Reglas de edición de citas: qué se puede modificar según el estado real de la cita.
 */

import { resolveAutomaticStatus } from './appointmentStatusAutomation.js';

export const IN_PROGRESS_EDIT_MESSAGE =
  'Esta cita ya está en curso y no se puede modificar.';

export const CLOSED_EDIT_MESSAGE =
  'Esta cita ya está cerrada y no se puede reprogramar.';

/**
 * Estados cuyo desenlace ya está escrito: reprogramarlos reescribiría el pasado.
 *
 * No basta con el candado de cambios manuales de estado que vive en el servicio:
 * ese solo se evalúa cuando el PUT trae `status`. Un PUT que solo manda
 * `startTime` lo esquiva por completo, que es exactamente el agujero que esta
 * guarda vino a tapar para `in_progress` y que quedó abierto para el resto.
 */
export const NON_EDITABLE_STATUSES = new Set([
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

/**
 * Campos cuya presencia en el payload significa reprogramar o rehacer la cita.
 * `status` y `cancelReason` quedan fuera a propósito: confirmar o cancelar se rige
 * por sus propias reglas, no por esta.
 */
export const RESCHEDULE_FIELDS = [
  'clientId',
  'barberId',
  'serviceId',
  'serviceIds',
  'appointmentDate',
  'startTime',
  'notes',
];

/**
 * ¿El payload intenta cambiar la cita en sí (no solo su estado)?
 *
 * @param {Record<string, unknown>} data
 * @returns {boolean}
 */
export function isRescheduleAttempt(data) {
  if (!data) return false;
  return RESCHEDULE_FIELDS.some((field) => data[field] !== undefined && data[field] !== null);
}

/**
 * Lanza Error con statusCode 400 si se intenta reprogramar una cita que ya empezó.
 *
 * Se mira el estado *efectivo* (hora Colombia), no `appointment.status`: la promoción
 * a `in_progress` la persiste el job de sincronización, así que en BD la cita puede
 * seguir como `confirmed` cuando el servicio ya está en curso. Con el valor crudo,
 * un PUT sin `status` reprogramaba una cita en marcha sin ningún error.
 *
 * @param {{ status?: string, appointmentDate?: unknown, startTime?: unknown, endTime?: unknown }} appointment
 * @param {Record<string, unknown>} data
 * @param {Date} [now]
 */
export function assertAppointmentIsEditable(appointment, data, now = new Date()) {
  if (!appointment) return;
  if (!isRescheduleAttempt(data)) return;
  const status = resolveAutomaticStatus(appointment, now);
  if (!NON_EDITABLE_STATUSES.has(status)) return;
  const err = new Error(
    status === 'in_progress' ? IN_PROGRESS_EDIT_MESSAGE : CLOSED_EDIT_MESSAGE
  );
  err.statusCode = 400;
  throw err;
}
