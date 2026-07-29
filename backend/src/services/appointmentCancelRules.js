/**
 * Reglas de cancelación de citas (lead time del cliente).
 */

import {
  buildColombiaDateTimeMs,
  getNowMs,
  resolveTimeStrings,
} from '../utils/colombiaTime.js';

export const CLIENT_CANCEL_LEAD_MINUTES = 30;

export const CLIENT_CANCEL_LEAD_MESSAGE =
  'Solo puedes cancelar la cita hasta 30 minutos antes de la hora de inicio.';

/**
 * ¿El cliente aún está dentro de la ventana para cancelar?
 * Debe cancelar al menos CLIENT_CANCEL_LEAD_MINUTES antes del inicio.
 *
 * @param {{ appointmentDate?: unknown, appointment_date?: unknown, startTime?: unknown, start_time?: unknown }} appointment
 * @param {Date} [now]
 * @returns {boolean}
 */
export function canClientCancelByLeadTime(appointment, now = new Date()) {
  if (!appointment) return false;
  const { date, start } = resolveTimeStrings(appointment);
  const startMs = buildColombiaDateTimeMs(date, start);
  if (startMs == null) return false;
  const deadlineMs = startMs - CLIENT_CANCEL_LEAD_MINUTES * 60 * 1000;
  return getNowMs(now) < deadlineMs;
}

/**
 * Lanza Error con statusCode 400 si el cliente ya no puede cancelar por lead time.
 *
 * @param {{ appointmentDate?: unknown, appointment_date?: unknown, startTime?: unknown, start_time?: unknown }} appointment
 * @param {Date} [now]
 */
export function assertClientCanCancelByLeadTime(appointment, now = new Date()) {
  if (canClientCancelByLeadTime(appointment, now)) return;
  const err = new Error(CLIENT_CANCEL_LEAD_MESSAGE);
  err.statusCode = 400;
  throw err;
}
