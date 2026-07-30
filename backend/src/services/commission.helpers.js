/**
 * Helpers puros de comisión (sin I/O).
 * Cálculos en centavos enteros para evitar drift de float.
 */

export const DEFAULT_COMMISSION_PERCENT = 40;

/**
 * Porcentaje efectivo: barbero → default negocio → 40.
 * @param {unknown} barberPercent
 * @param {unknown} defaultPercent
 * @returns {number}
 */
export function resolveCommissionPercent(barberPercent, defaultPercent) {
  const fromBarber = toFiniteNumber(barberPercent);
  if (fromBarber != null) return fromBarber;
  const fromDefault = toFiniteNumber(defaultPercent);
  if (fromDefault != null) return fromDefault;
  return DEFAULT_COMMISSION_PERCENT;
}

/**
 * Comisión = serviceAmount × percent / 100, redondeo a centavo.
 * @param {unknown} serviceAmount
 * @param {unknown} percent
 * @returns {number}
 */
export function computeCommissionAmount(serviceAmount, percent) {
  const cents = Math.round(Number(serviceAmount ?? 0) * 100);
  const pct = toFiniteNumber(percent) ?? 0;
  const commissionCents = Math.round((cents * pct) / 100);
  return commissionCents / 100;
}

function toFiniteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
