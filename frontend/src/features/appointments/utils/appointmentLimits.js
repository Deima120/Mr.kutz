/**
 * Tope de citas pendientes por cliente.
 *
 * Espejo de `backend/src/services/appointmentLimitRules.js`, que es la regla real:
 * esto solo sirve para avisar antes de que el cliente pierda tiempo llenando el
 * formulario. Se replica igual que ya se hace con el máximo de servicios por cita.
 *
 * El import es relativo y con extensión `.js` a propósito: el alias `@/` solo lo
 * resuelve Vite, y el runner nativo de Node exige la extensión explícita. Con
 * cualquiera de las dos cosas mal, este módulo deja de ser ejecutable en pruebas
 * (que es justo lo que le pasa hoy a `inventory/utils/productFormatters`).
 */

import { buildColombiaDateTimeMs, getNowMs } from '../../../shared/utils/colombiaTime.js';

export const MAX_PENDING_APPOINTMENTS_PER_CLIENT = 3;

/** Estados que ocupan cupo mientras la cita no haya empezado. */
export const PENDING_STATUSES = 'scheduled,confirmed';

/**
 * Cuántas filas pedir para contar el cupo. Holgado a propósito frente al tope de
 * 3: hay que traer también las que luego se descartan por hora para no contarlas
 * de menos, y aun así son poquísimas filas.
 */
export const PENDING_FETCH_LIMIT = 20;

/** Mismos estados terminales que descarta el backend. */
const TERMINAL_STATUSES = new Set(['cancelled', 'no_show', 'completed']);

export function pendingLimitMessage(limit = MAX_PENDING_APPOINTMENTS_PER_CLIENT) {
  return `Ya tienes ${limit} citas pendientes, que es el máximo permitido. Cuando asistas a una de ellas (o la canceles) podrás agendar otra.`;
}

/**
 * ¿Esta cita ocupa cupo ahora mismo?
 *
 * El corte por hora de inicio es la mitad que faltaba: filtrar solo por fecha
 * («de hoy en adelante») cuenta también la cita de esta misma mañana a la que el
 * cliente ya no llega a tiempo, que el backend NO cuenta. Sin esto el aviso se
 * adelanta y bloquea el botón para algo que la API sí habría aceptado.
 *
 * Acepta las dos formas de nombrar los campos porque la API devuelve snake_case
 * y el formulario trabaja en camelCase.
 *
 * @param {{ status?: string }} appointment
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isPendingAppointment(appointment, now = new Date()) {
  if (!appointment) return false;
  if (TERMINAL_STATUSES.has(appointment.status)) return false;

  const date = appointment.appointment_date ?? appointment.appointmentDate;
  const start = appointment.start_time ?? appointment.startTime;
  const startMs = buildColombiaDateTimeMs(date, start);
  // Sin hora utilizable se cuenta, que es el lado conservador: como mucho el
  // cliente ve el aviso de más, nunca se le promete un cupo que la API negará.
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
