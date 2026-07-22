/**
 * Parseo estricto de hora de cita (HH:MM). Nunca inventa valores.
 */

function httpError(message, statusCode = 400, field = 'startTime') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.field = field;
  return error;
}

/**
 * @param {unknown} value
 * @param {{ field?: string, required?: boolean }} [options]
 * @returns {{ hours: number, minutes: number, totalMinutes: number, normalized: string } | null}
 */
export function parseClockTime(value, { field = 'startTime', required = true } = {}) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    if (!required) return null;
    throw httpError('La hora de inicio es obligatoria.', 400, field);
  }

  const str = String(value).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw httpError('La hora debe tener formato HH:MM.', 400, field);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw httpError('La hora de inicio no es válida.', 400, field);
  }

  const normalized = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
    normalized,
  };
}

/** Date UTC 1970-01-01T{HH:MM}:00Z para columnas Time de Prisma. */
export function clockTimeToDate(parsed) {
  return new Date(`1970-01-01T${parsed.normalized}:00Z`);
}
