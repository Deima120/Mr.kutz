/**
 * Hora civil de Colombia (America/Bogota, UTC-5 sin horario de verano).
 * Usar para comparar citas y estados automáticos en tiempo real.
 */

export const APP_TIMEZONE = 'America/Bogota';
export const COLOMBIA_UTC_OFFSET = '-05:00';

export function parseTimeParts(timeStr) {
  const m = String(timeStr || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { h: parseInt(m[1], 10), min: parseInt(m[2], 10) };
}

/** YYYY-MM-DD desde columna DATE o ISO (parte calendario UTC). */
export function extractAppointmentDateYmd(raw) {
  if (raw == null || raw === '') return '';
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (str) {
    const head = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (head) return `${head[1]}-${head[2]}-${head[3]}`;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  const head = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (head) return `${head[1]}-${head[2]}-${head[3]}`;
  return '';
}

/** Instantánea de la hora actual en Colombia. */
export function getColombiaNowParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
}

/** Fecha de hoy en Colombia YYYY-MM-DD */
export function getColombiaTodayYmd(date = new Date()) {
  const p = getColombiaNowParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Primer día del mes actual en Colombia */
export function getColombiaFirstDayOfMonthYmd(date = new Date()) {
  const p = getColombiaNowParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-01`;
}

/**
 * Convierte fecha de cita + HH:MM (hora de negocio en Colombia) a timestamp UTC.
 */
export function buildColombiaDateTimeMs(appointmentDate, timeStr) {
  const ymd = extractAppointmentDateYmd(appointmentDate);
  const tp = parseTimeParts(timeStr);
  if (!ymd || !tp) return null;
  const iso = `${ymd}T${String(tp.h).padStart(2, '0')}:${String(tp.min).padStart(2, '0')}:00${COLOMBIA_UTC_OFFSET}`;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Milisegundos UTC actuales (equivalente global; las citas se anclan a Colombia). */
export function getNowMs(date = new Date()) {
  return date.getTime();
}
