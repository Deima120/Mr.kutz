/**
 * Rangos de fechas de negocio (citas y filtros de consulta).
 * Día civil en Colombia vía colombiaTime.
 */

import { addDaysToYmd, extractAppointmentDateYmd, getColombiaTodayYmd } from './colombiaTime.js';
import { body, query } from 'express-validator';

export const APPOINTMENT_HORIZON_DAYS_PUBLIC = 60;
export const APPOINTMENT_HORIZON_DAYS_STAFF = 365;
/** Ventana máxima dateFrom→dateTo en listados/reportes. */
export const QUERY_DATE_RANGE_MAX_DAYS = 366;

export function horizonDaysForRole(role) {
  if (role === 'admin' || role === 'barber') return APPOINTMENT_HORIZON_DAYS_STAFF;
  return APPOINTMENT_HORIZON_DAYS_PUBLIC;
}

export function getAppointmentDateBounds({
  horizonDays = APPOINTMENT_HORIZON_DAYS_PUBLIC,
  todayYmd = getColombiaTodayYmd(),
} = {}) {
  const today = extractAppointmentDateYmd(todayYmd) || getColombiaTodayYmd();
  return {
    min: today,
    max: addDaysToYmd(today, horizonDays),
    horizonDays,
  };
}

/**
 * @returns {{ ok: true, ymd: string } | { ok: false, message: string }}
 */
export function validateAppointmentDateYmd(raw, bounds) {
  const ymd = extractAppointmentDateYmd(raw);
  if (!ymd) {
    return { ok: false, message: 'Indica una fecha válida.' };
  }
  const { min, max, horizonDays } = bounds;
  if (ymd < min) {
    return { ok: false, message: 'La fecha de la cita no puede ser anterior a hoy.' };
  }
  if (ymd > max) {
    return {
      ok: false,
      message: `La fecha de la cita no puede superar ${horizonDays} días desde hoy.`,
    };
  }
  return { ok: true, ymd };
}

/**
 * @returns {{ ok: true } | { ok: false, message: string, field?: string }}
 */
export function validateQueryDateOrder(dateFrom, dateTo, { maxSpanDays = QUERY_DATE_RANGE_MAX_DAYS } = {}) {
  const from = dateFrom ? extractAppointmentDateYmd(dateFrom) : '';
  const to = dateTo ? extractAppointmentDateYmd(dateTo) : '';
  if (from && to && from > to) {
    return {
      ok: false,
      field: 'dateFrom',
      message: 'La fecha inicial no puede ser posterior a la fecha final.',
    };
  }
  if (from && to && maxSpanDays != null) {
    const spanEnd = addDaysToYmd(from, maxSpanDays);
    if (to > spanEnd) {
      return {
        ok: false,
        field: 'dateTo',
        message: `El rango de fechas no puede superar ${maxSpanDays} días.`,
      };
    }
  }
  return { ok: true };
}

/** express-validator: body appointmentDate dentro del horizonte. */
export function appointmentDateBody({
  getHorizonDays = () => APPOINTMENT_HORIZON_DAYS_PUBLIC,
  optional = false,
} = {}) {
  const chain = optional
    ? body('appointmentDate').optional({ checkFalsy: true })
    : body('appointmentDate');

  return chain.custom((value, { req }) => {
    if (optional && (value == null || value === '')) return true;
    const horizonDays = getHorizonDays(req);
    const result = validateAppointmentDateYmd(value, getAppointmentDateBounds({ horizonDays }));
    if (!result.ok) throw new Error(result.message);
    return true;
  });
}

/** express-validator: query date (slots) dentro del horizonte. */
export function appointmentSlotDateQuery({
  getHorizonDays = () => APPOINTMENT_HORIZON_DAYS_PUBLIC,
  field = 'date',
} = {}) {
  return query(field).custom((value, { req }) => {
    const horizonDays = getHorizonDays(req);
    const result = validateAppointmentDateYmd(value, getAppointmentDateBounds({ horizonDays }));
    if (!result.ok) throw new Error(result.message);
    return true;
  });
}

/** express-validator: dateFrom ≤ dateTo y span máximo (si ambos vienen). */
export function dateRangeOrderQuery({ maxSpanDays = QUERY_DATE_RANGE_MAX_DAYS } = {}) {
  return query('dateTo').custom((_, { req }) => {
    const result = validateQueryDateOrder(req.query?.dateFrom, req.query?.dateTo, { maxSpanDays });
    if (!result.ok) throw new Error(result.message);
    return true;
  });
}
