/**
 * Formato de dinero canónico COP (estilo colombiano es-CO).
 * Miles con punto: $1.000, $100.000 — sin decimales en UI.
 * Único helper de display de moneda en frontend (pagos, compras, inventario,
 * servicios, citas, landing, dashboard, reportes, exports).
 * DB puede guardar Decimal(10,2); aquí solo se presenta.
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
 * @param {unknown} n
 */
export function formatMoneyOrDash(n) {
  if (n == null || n === '') return '—';
  const parsed = toSafeNumber(n);
  if (!Number.isFinite(parsed)) return '—';
  return formatMoney(parsed);
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

/** Teclas de un solo carácter que no son dígito (símbolos: - + . , $ e…). */
const MONEY_KEY_ALLOWED = /^[0-9]$/;

/**
 * Impide teclear símbolos en campos de dinero/cantidad: el campo solo admite
 * enteros positivos, así que se descarta la pulsación antes de que llegue al
 * input en vez de mostrar un aviso después.
 *
 * Deja pasar teclas de control/navegación (Backspace, Tab, flechas…) y los
 * atajos con Ctrl/Cmd (copiar, pegar, deshacer); el pegado se sanea igual con
 * `formatMoneyInputDigits` en el `onChange`.
 *
 * @param {KeyboardEvent} event
 */
export function blockNonDigitKeys(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length !== 1) return;
  if (MONEY_KEY_ALLOWED.test(event.key)) return;
  event.preventDefault();
}
