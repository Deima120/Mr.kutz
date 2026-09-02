/**
 * Reglas de edición de citas: qué se puede modificar según el estado real de la cita.
 */

import { resolveAutomaticStatus } from './appointmentStatusAutomation.js';

export const IN_PROGRESS_EDIT_MESSAGE =
  'Esta cita ya está en curso y no se puede modificar.';

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
  if (resolveAutomaticStatus(appointment, now) !== 'in_progress') return;
  const err = new Error(IN_PROGRESS_EDIT_MESSAGE);
  err.statusCode = 400;
  throw err;
}
