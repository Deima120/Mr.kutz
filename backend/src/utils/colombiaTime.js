/**
 * Hora civil de Colombia (America/Bogota, UTC-5 sin horario de verano).
 */

export const APP_TIMEZONE = 'America/Bogota';
export const COLOMBIA_UTC_OFFSET = '-05:00';

export function parseTimeParts(timeStr) {
  const m = String(timeStr || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { h: parseInt(m[1], 10), min: parseInt(m[2], 10) };
}

function timeStrFromRecord(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  const m = String(value).match(/(\d{1,2}):(\d{2})/);
  return m ? `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}` : '';
}

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

export function buildColombiaDateTimeMs(appointmentDate, timeStr) {
  const ymd = extractAppointmentDateYmd(appointmentDate);
  const tp = parseTimeParts(timeStr);
  if (!ymd || !tp) return null;
  const iso = `${ymd}T${String(tp.h).padStart(2, '0')}:${String(tp.min).padStart(2, '0')}:00${COLOMBIA_UTC_OFFSET}`;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function resolveTimeStrings(record) {
  return {
    start: timeStrFromRecord(record.startTime ?? record.start_time),
    end: timeStrFromRecord(record.endTime ?? record.end_time),
    date: record.appointmentDate ?? record.appointment_date,
  };
}

export function getNowMs(date = new Date()) {
  return date.getTime();
}

export function getColombiaTodayYmd(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
