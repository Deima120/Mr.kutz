/**
 * Autocompletado de montos por método de pago (puro, sin UI).
 *
 * Regla: restante = total − Σ montos con source === 'manual'.
 * El último método con source === 'auto' absorbe ese restante.
 * Nunca asume mitad/mitad. amountTendered no participa aquí.
 */

export const SPLIT_SOURCE_AUTO = 'auto';
export const SPLIT_SOURCE_MANUAL = 'manual';

/**
 * @param {unknown} value
 * @returns {number} centavos enteros (puede ser negativo si el input lo es)
 */
export function moneyToCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * @param {number} cents
 * @returns {number} monto con 2 decimales (number)
 */
export function centsToMoney(cents) {
  return Math.round(Number(cents) || 0) / 100;
}

function normalizeRow(row = {}) {
  const source =
    row.source === SPLIT_SOURCE_MANUAL ? SPLIT_SOURCE_MANUAL : SPLIT_SOURCE_AUTO;
  return {
    key: String(row.key ?? ''),
    paymentMethodId: row.paymentMethodId ?? '',
    amount: centsToMoney(moneyToCents(row.amount)),
    source,
  };
}

/**
 * Redistribuye montos según total y source por fila.
 *
 * @param {{ total: unknown, rows?: Array<object> }} args
 * @returns {Array<{ key: string, paymentMethodId: unknown, amount: number, source: 'auto'|'manual' }>}
 */
export function allocateMethodSplitAmounts({ total, rows = [] } = {}) {
  const list = (Array.isArray(rows) ? rows : []).map(normalizeRow);
  const totalCents = moneyToCents(total);

  if (list.length === 0) return [];

  if (list.length === 1) {
    return [
      {
        ...list[0],
        amount: centsToMoney(Math.max(0, totalCents)),
        source: SPLIT_SOURCE_AUTO,
      },
    ];
  }

  let sinkIndex = -1;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].source === SPLIT_SOURCE_AUTO) {
      sinkIndex = i;
      break;
    }
  }

  if (sinkIndex < 0) {
    return list.map((row) => ({ ...row }));
  }

  const manualCents = list.reduce((sum, row) => {
    if (row.source !== SPLIT_SOURCE_MANUAL) return sum;
    return sum + moneyToCents(row.amount);
  }, 0);

  const remainingCents = totalCents - manualCents;

  return list.map((row, index) => {
    if (row.source === SPLIT_SOURCE_MANUAL) {
      return { ...row };
    }
    if (index === sinkIndex) {
      return {
        ...row,
        amount: centsToMoney(remainingCents),
        source: SPLIT_SOURCE_AUTO,
      };
    }
    return {
      ...row,
      amount: 0,
      source: SPLIT_SOURCE_AUTO,
    };
  });
}

/**
 * Marca una fila como manual con el monto dado y recalcula autos.
 */
export function setMethodSplitManualAmount({ total, rows = [], key, amount } = {}) {
  const next = (Array.isArray(rows) ? rows : []).map((row) =>
    String(row.key) === String(key)
      ? { ...row, amount, source: SPLIT_SOURCE_MANUAL }
      : { ...row }
  );
  return allocateMethodSplitAmounts({ total, rows: next });
}

/**
 * Quita una fila y recalcula el restante.
 */
export function removeMethodSplitRow({ total, rows = [], key } = {}) {
  const next = (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row.key) !== String(key)
  );
  return allocateMethodSplitAmounts({ total, rows: next });
}

/**
 * Agrega una fila (por defecto auto) y recalcula.
 */
export function addMethodSplitRow({
  total,
  rows = [],
  newRow = {},
} = {}) {
  const row = {
    key: newRow.key,
    paymentMethodId: newRow.paymentMethodId ?? '',
    amount: newRow.amount ?? 0,
    source: newRow.source ?? SPLIT_SOURCE_AUTO,
  };
  return allocateMethodSplitAmounts({
    total,
    rows: [...(Array.isArray(rows) ? rows : []), row],
  });
}

/**
 * Suma de montos actuales vs total (para indicador en vivo).
 * @returns {number} total − Σ amounts (positivo = falta, negativo = sobra)
 */
export function remainingMethodSplitAmount(total, rows = []) {
  const sumCents = (Array.isArray(rows) ? rows : []).reduce(
    (acc, row) => acc + moneyToCents(row.amount),
    0
  );
  return centsToMoney(moneyToCents(total) - sumCents);
}

/**
 * @returns {{ kind: 'complete'|'short'|'over', remaining: number }}
 */
export function methodSplitAllocationStatus(total, rows = []) {
  const remaining = remainingMethodSplitAmount(total, rows);
  const cents = moneyToCents(remaining);
  if (cents === 0) return { kind: 'complete', remaining: 0 };
  if (cents > 0) return { kind: 'short', remaining };
  return { kind: 'over', remaining: Math.abs(remaining) };
}
