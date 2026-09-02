/**
 * Estado efectivo de citas — hora de Colombia (America/Bogota).
 */

import {
  buildColombiaDateTimeMs,
  extractAppointmentDateYmd,
  getNowMs,
  parseTimeParts,
} from '@/shared/utils/colombiaTime';

export const COMPLETION_GRACE_MINUTES = 10;
export const CLIENT_CANCEL_LEAD_MINUTES = 30;

const TERMINAL = new Set(['cancelled', 'no_show', 'completed']);

export function computeAutomaticStatus(currentStatus, startMs, endMs, nowMs = getNowMs()) {
  if (TERMINAL.has(currentStatus)) return currentStatus;
  if (startMs == null || endMs == null) return currentStatus;

  const completeAtMs = endMs + COMPLETION_GRACE_MINUTES * 60 * 1000;

  if (currentStatus === 'confirmed' || currentStatus === 'in_progress') {
    if (nowMs >= completeAtMs) return 'completed';
    if (nowMs >= startMs) return 'in_progress';
    return currentStatus;
  }

  return currentStatus;
}

export function getEffectiveAppointmentStatus(appointment, now = new Date()) {
  const status = appointment?.status;
  if (!status) return status;
  const startMs = buildColombiaDateTimeMs(appointment.appointment_date, appointment.start_time);
  const endMs = buildColombiaDateTimeMs(appointment.appointment_date, appointment.end_time);
  return computeAutomaticStatus(status, startMs, endMs, getNowMs(now));
}

export function isAppointmentActionsLocked(appointment, now = new Date()) {
  const status = getEffectiveAppointmentStatus(appointment, now);
  return ['cancelled', 'no_show', 'completed', 'in_progress'].includes(status);
}

export function canConfirmAppointment(appointment, now = new Date()) {
  const status = getEffectiveAppointmentStatus(appointment, now);
  return status === 'scheduled' || status === 'confirmed';
}

/**
 * ¿Quedan al menos CLIENT_CANCEL_LEAD_MINUTES antes del inicio?
 */
export function canClientCancelByLeadTime(appointment, now = new Date()) {
  if (!appointment) return false;
  const startMs = buildColombiaDateTimeMs(appointment.appointment_date, appointment.start_time);
  if (startMs == null) return false;
  const deadlineMs = startMs - CLIENT_CANCEL_LEAD_MINUTES * 60 * 1000;
  return getNowMs(now) < deadlineMs;
}

/**
 * @param {object} appointment
 * @param {Date} [now]
 * @param {{ requireLeadTime?: boolean }} [options] — true para clientes (ventana de 30 min)
 */
export function canCancelAppointment(appointment, now = new Date(), options = {}) {
  const status = getEffectiveAppointmentStatus(appointment, now);
  if (status !== 'scheduled' && status !== 'confirmed') return false;
  if (options.requireLeadTime) return canClientCancelByLeadTime(appointment, now);
  return true;
}

export { extractAppointmentDateYmd, parseTimeParts, buildColombiaDateTimeMs, getNowMs };

/**
 * ¿Se puede marcar esta cita como «no asistió»?
 *
 * Espejo de `backend/src/services/appointmentNoShowRules.js`; el backend es la
 * regla real y esta copia solo decide si el botón se muestra.
 *
 * Se admite desde `in_progress` y `completed` a propósito: la automatización
 * promueve sola las citas confirmadas (a `in_progress` a su hora y a `completed`
 * diez minutos después de terminar), así que cuando el personal se sienta a
 * registrar la inasistencia la cita ya suele haber avanzado. Si no se admitieran,
 * el botón desaparecería justo en el caso más común.
 */
const NO_SHOW_SOURCE = new Set(['scheduled', 'confirmed', 'in_progress', 'completed']);

export function canMarkNoShow(appointment, now = new Date()) {
  if (!appointment) return false;
  const status = getEffectiveAppointmentStatus(appointment, now);
  if (!NO_SHOW_SOURCE.has(status)) return false;
  // Una cita cobrada es, por definición, una a la que el cliente asistió.
  if (appointment.has_active_payment) return false;
  const startMs = buildColombiaDateTimeMs(appointment.appointment_date, appointment.start_time);
  if (startMs == null) return false;
  return getNowMs(now) >= startMs;
}
