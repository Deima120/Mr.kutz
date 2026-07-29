/**
 * Rangos de fechas de negocio (espejo del backend dateRange).
 */

import {
  extractAppointmentDateYmd,
  getColombiaTodayYmd,
} from './colombiaTime.js';

export const APPOINTMENT_HORIZON_DAYS_PUBLIC = 60;
export const APPOINTMENT_HORIZON_DAYS_STAFF = 365;
export const QUERY_DATE_RANGE_MAX_DAYS = 366;

function addDaysToYmd(ymd, days) {
  const base = extractAppointmentDateYmd(ymd);
  if (!base) return '';
  const [y, m, d] = base.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + (Number(days) || 0)));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

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
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateQueryDateOrder(dateFrom, dateTo, { maxSpanDays = QUERY_DATE_RANGE_MAX_DAYS } = {}) {
  const from = dateFrom ? extractAppointmentDateYmd(dateFrom) : '';
  const to = dateTo ? extractAppointmentDateYmd(dateTo) : '';
  if (from && to && from > to) {
    return {
      ok: false,
      message: 'La fecha inicial no puede ser posterior a la fecha final.',
    };
  }
  if (from && to && maxSpanDays != null) {
    const spanEnd = addDaysToYmd(from, maxSpanDays);
    if (to > spanEnd) {
      return {
        ok: false,
        message: `El rango de fechas no puede superar ${maxSpanDays} días.`,
      };
    }
  }
  return { ok: true };
}
