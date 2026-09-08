/**
 * Reglas para marcar una cita como «no asistió» (`no_show`).
 *
 * Solo tiene sentido después de la hora de inicio: marcar como inasistente una
 * cita que todavía no ha empezado sería adivinar. Quién puede marcarla se decide
 * en el controlador (el admin en cualquier cita; el barbero solo en las suyas).
 */

import {
  buildColombiaDateTimeMs,
  getNowMs,
  resolveTimeStrings,
} from '../utils/colombiaTime.js';

export const NO_SHOW_TOO_EARLY_MESSAGE =
  'Solo puedes marcar «no asistió» después de la hora de inicio de la cita.';

export const NO_SHOW_PAID_MESSAGE =
  'Esta cita tiene un cobro registrado, así que no puede marcarse como «no asistió». Anula el cobro primero.';

export const NO_SHOW_LOCKED_MESSAGE =
  'Esta cita ya está cancelada o marcada como no asistió.';

/**
 * Estados desde los que SÍ se admite pasar a `no_show`.
 *
 * Decisión explícita del propietario (2026-09-07): solo `scheduled` y
 * `confirmed`. Se le advirtió que, como la automatización pasa una cita
 * confirmada a `in_progress` en el mismo instante en que se cumple su hora de
 * inicio (es un cálculo de tiempo, no si el cliente llegó de verdad), en la
 * práctica esto deja "no asistió" utilizable solo para citas que nunca se
 * confirmaron (se quedan en `scheduled` para siempre) — y aun así lo pidió así.
 * `in_progress`/`completed` quedan fuera a propósito, junto con los desenlaces
 * ya cerrados (`cancelled`, `no_show`).
 */
export const NO_SHOW_SOURCE_STATUSES = new Set([
  'scheduled',
  'confirmed',
]);

/**
 * @param {{ appointmentDate?: unknown, appointment_date?: unknown, startTime?: unknown, start_time?: unknown }} appointment
 * @param {Date} [now]
 * @returns {boolean}
 */
export function canMarkNoShow(appointment, now = new Date()) {
  if (!appointment) return false;
  const { date, start } = resolveTimeStrings(appointment);
  const startMs = buildColombiaDateTimeMs(date, start);
  if (startMs == null) return false;
  return getNowMs(now) >= startMs;
}

/**
 * Lanza 400 si esta cita no admite marcarse como «no asistió».
 *
 * @param {{ status?: string }} appointment Cita tal como está en BD.
 * @param {Date} [now]
 * @param {{ hasActivePayment?: boolean }} [context]
 */
export function assertCanMarkNoShow(appointment, now = new Date(), { hasActivePayment = false } = {}) {
  if (!appointment) {
    const err = new Error('Cita no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  if (!NO_SHOW_SOURCE_STATUSES.has(appointment.status)) {
    const err = new Error(NO_SHOW_LOCKED_MESSAGE);
    err.statusCode = 400;
    throw err;
  }

  // Una cita cobrada es, por definición, una cita a la que el cliente asistió.
  if (hasActivePayment) {
    const err = new Error(NO_SHOW_PAID_MESSAGE);
    err.statusCode = 409;
    throw err;
  }

  if (!canMarkNoShow(appointment, now)) {
    const err = new Error(NO_SHOW_TOO_EARLY_MESSAGE);
    err.statusCode = 400;
    throw err;
  }
}
