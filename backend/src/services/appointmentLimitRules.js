/**
 * Tope de citas pendientes por cliente.
 *
 * Regla: un cliente no puede tener más de MAX_PENDING_APPOINTMENTS_PER_CLIENT
 * citas **pendientes a la vez**. Se cuenta el saldo vivo, no las citas creadas en
 * un periodo: al contar por mes se castigaría al cliente fiel que sí asiste y
 * paga varias veces al mes, que es justo el que interesa conservar. Con el saldo
 * vivo, quien asiste libera cupo de inmediato y quien acumula reservas sin ir se
 * bloquea solo.
 *
 * «Pendiente» = estado no terminal Y cuya hora de inicio (hora de Colombia) aún
 * no ha pasado. El corte por futuro es deliberado: `computeAutomaticStatus` solo
 * promueve citas `confirmed`/`in_progress`, así que una cita que el barbero nunca
 * confirmó se queda en `scheduled` para siempre. Sin el corte, tres citas viejas
 * sin confirmar dejarían al cliente bloqueado de por vida sin ninguna forma de
 * recuperarse por su cuenta. El castigo al que no asiste es la otra mitad del
 * sistema (marcar «no asistió» e inactivar al cliente), no un bloqueo eterno.
 */

import {
  buildColombiaDateTimeMs,
  getNowMs,
  resolveTimeStrings,
} from '../utils/colombiaTime.js';
import { APPOINTMENT_TERMINAL_STATUSES } from './appointmentStatusAutomation.js';

export const MAX_PENDING_APPOINTMENTS_PER_CLIENT = 3;

/** Código estable para que web y móvil distingan este 409 de un solape de horario. */
export const APPOINTMENT_LIMIT_REASON = 'APPOINTMENT_LIMIT_REACHED';

export function buildPendingLimitMessage(limit = MAX_PENDING_APPOINTMENTS_PER_CLIENT) {
  return (
    `Ya tienes ${limit} citas pendientes, que es el máximo permitido. ` +
    'Cuando asistas a una de ellas (o la canceles) podrás agendar otra.'
  );
}

/**
 * ¿Esta cita ocupa cupo ahora mismo?
 *
 * Acepta registros en camelCase o snake_case porque `resolveTimeStrings` ya
 * normaliza ambas formas (el servicio devuelve una y las consultas crudas otra).
 *
 * @param {{ status?: unknown }} appointment
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isPendingAppointment(appointment, now = new Date()) {
  if (!appointment) return false;
  if (APPOINTMENT_TERMINAL_STATUSES.has(appointment.status)) return false;

  const { date, start } = resolveTimeStrings(appointment);
  const startMs = buildColombiaDateTimeMs(date, start);
  // Sin hora utilizable no se puede afirmar que ya pasó: se cuenta, que es el
  // lado conservador (como mucho el cliente espera, nunca se salta el tope).
  if (startMs == null) return true;

  return getNowMs(now) < startMs;
}

/**
 * @param {Array<object>} appointments
 * @param {Date} [now]
 * @returns {number}
 */
export function countPendingAppointments(appointments, now = new Date()) {
  if (!Array.isArray(appointments)) return 0;
  return appointments.filter((a) => isPendingAppointment(a, now)).length;
}

/**
 * Lanza 409 si el cliente ya agotó su cupo.
 *
 * 409 y no 400 porque es un conflicto con el estado actual, no un cuerpo mal
 * formado; es el mismo código que ya usa el solape de horarios.
 *
 * @param {Array<object>} appointments Citas del cliente candidatas a ocupar cupo.
 * @param {Date} [now]
 * @param {{ limit?: number }} [options]
 */
export function assertUnderPendingLimit(
  appointments,
  now = new Date(),
  { limit = MAX_PENDING_APPOINTMENTS_PER_CLIENT } = {}
) {
  const pending = countPendingAppointments(appointments, now);
  if (pending < limit) return;

  const err = new Error(buildPendingLimitMessage(limit));
  err.statusCode = 409;
  err.reason = APPOINTMENT_LIMIT_REASON;
  err.details = { limit, pending };
  throw err;
}

/**
 * Tope de citas por cliente EL MISMO DÍA calendario.
 *
 * Es una regla distinta del cupo de pendientes de arriba: aquella cuenta el
 * saldo vivo sin importar la fecha (protege contra acumular reservas sin ir);
 * esta cuenta cuántas veces se agenda un mismo día, sin importar si ya pasaron
 * o no. Por eso aquí `completed` SÍ cuenta — un cliente que ya fue y completó
 * 3 citas hoy no debería poder agendar una 4ª para hoy mismo — y solo se
 * excluyen `cancelled`/`no_show`, que representan cupos que quedaron libres.
 */
export const MAX_APPOINTMENTS_PER_CLIENT_PER_DAY = 3;

/** Código estable para que web y móvil distingan este 409 de los otros topes. */
export const APPOINTMENT_DAILY_LIMIT_REASON = 'APPOINTMENT_DAILY_LIMIT_REACHED';

export function buildDailyLimitMessage(limit = MAX_APPOINTMENTS_PER_CLIENT_PER_DAY) {
  return (
    `Ya tienes ${limit} citas agendadas para ese día, que es el máximo permitido. ` +
    'Elige otra fecha.'
  );
}

const DAILY_LIMIT_EXCLUDED_STATUSES = new Set(['cancelled', 'no_show']);

/**
 * @param {Array<{ status?: unknown }>} appointmentsOnDate Citas del cliente para el día candidato.
 * @returns {number}
 */
export function countAppointmentsForDay(appointmentsOnDate) {
  if (!Array.isArray(appointmentsOnDate)) return 0;
  return appointmentsOnDate.filter((a) => !DAILY_LIMIT_EXCLUDED_STATUSES.has(a?.status)).length;
}

/**
 * Lanza 409 si el cliente ya agotó su tope de citas para ese día.
 *
 * @param {Array<{ status?: unknown }>} appointmentsOnDate Citas del cliente para el día candidato.
 * @param {{ limit?: number }} [options]
 */
export function assertUnderDailyLimit(
  appointmentsOnDate,
  { limit = MAX_APPOINTMENTS_PER_CLIENT_PER_DAY } = {}
) {
  const count = countAppointmentsForDay(appointmentsOnDate);
  if (count < limit) return;

  const err = new Error(buildDailyLimitMessage(limit));
  err.statusCode = 409;
  err.reason = APPOINTMENT_DAILY_LIMIT_REASON;
  err.details = { limit, count };
  throw err;
}
