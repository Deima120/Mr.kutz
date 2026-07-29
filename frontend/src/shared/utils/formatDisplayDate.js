/**
 * Fechas visibles en UI — locale es-CO, zona America/Bogota.
 */

import { APP_TIMEZONE } from '@/shared/utils/colombiaTime';

export const APP_LOCALE = 'es-CO';

/**
 * @param {unknown} value
 * @param {Intl.DateTimeFormatOptions} [opts]
 */
export function formatDisplayDate(value, opts = {}) {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

/**
 * @param {unknown} value
 * @param {Intl.DateTimeFormatOptions} [opts]
 */
export function formatDisplayDateTime(value, opts = {}) {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  });
}
