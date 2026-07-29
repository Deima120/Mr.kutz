/**
 * Formato de dinero canónico COP (estilo colombiano es-CO).
 * Misma contrato que frontend/src/shared/utils/money.js — display, no persistencia.
 * Miles con punto: $1.000, $100.000 — sin decimales en presentación.
 */

/**
 * Interpreta montos escritos a mano en formato CO o plano.
 */
export function parseMoneyInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  let s = raw.replace(/\$/g, '').replace(/\s/g, '');
  if (!s) return NaN;

  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function toSafeNumber(n) {
  if (n == null || n === '') return NaN;
  if (typeof n === 'string') return parseMoneyInput(n);
  const num = Number(n);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * @param {unknown} n
 * @returns {string} p.ej. "$1.000" · "$100.000" · "$0"
 */
export function formatMoney(n) {
  const parsed = toSafeNumber(n);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `$${Math.round(safe).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Igual que formatMoney, pero null/NaN → "—".
 */
export function formatMoneyOrDash(n) {
  if (n == null || n === '') return '—';
  const parsed = toSafeNumber(n);
  if (!Number.isFinite(parsed)) return '—';
  return formatMoney(parsed);
}
