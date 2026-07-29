/**
 * Formato de dinero canónico COP (estilo colombiano es-CO).
 * Miles con punto: $1.000, $100.000 — sin decimales forzados.
 * Usar en pagos, dashboard, reportes y exports de ingresos.
 */

/**
 * Interpreta montos escritos a mano en formato CO o plano.
 * Ej.: "1.000" → 1000, "100.000" → 100000, "1.500,50" → 1500.5, "1500" → 1500
 */
export function parseMoneyInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  let s = raw.replace(/\$/g, '').replace(/\s/g, '');
  if (!s) return NaN;

  if (s.includes(',') && s.includes('.')) {
    // 1.500,50
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // 1500,50
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // 1.000 · 100.000 · 1.000.000
    s = s.replace(/\./g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {unknown} n
 * @returns {string} p.ej. "$1.000" · "$100.000"
 */
export function formatMoney(n) {
  const parsed = typeof n === 'string' ? parseMoneyInput(n) : Number(n);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `$${Math.round(safe).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formatea el valor de un input mientras se escribe (solo enteros con miles).
 * Devuelve string sin "$" para el campo: "1.000", "100.000"
 */
export function formatMoneyInputDigits(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const n = Number(digits);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
