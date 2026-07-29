/**
 * Helpers de pago mixto (método + monto). Sin Prisma I/O.
 * Independiente de PaymentLine (qué se cobró vs con qué se pagó).
 */

import {
  httpPaymentError,
  moneyToNumber,
  toMoneyDecimal,
} from './payment.lines.helpers.js';

const MAX_METHOD_SPLITS = 20;

/**
 * @param {unknown} value
 * @returns {number} monto redondeado a 2 decimales (number)
 */
function toMoneyNumber(value) {
  return moneyToNumber(toMoneyDecimal(value));
}

/**
 * Suma montos de splits en centavos enteros → number con 2 decimales.
 * @param {Array<{ amount: unknown }>} splits
 */
export function sumSplitAmounts(splits = []) {
  const cents = splits.reduce(
    (acc, split) => acc + Math.round(moneyToNumber(split.amount) * 100),
    0
  );
  return cents / 100;
}

/**
 * Normaliza methodSplits[]: montos > 0, ids válidos, sin métodos duplicados.
 * @param {unknown} rawSplits
 * @returns {Array<{ paymentMethodId: number, amount: number }>}
 */
export function normalizeMethodSplits(rawSplits) {
  if (!Array.isArray(rawSplits) || rawSplits.length === 0) {
    throw httpPaymentError('Incluye al menos un método de pago en methodSplits[].');
  }
  if (rawSplits.length > MAX_METHOD_SPLITS) {
    throw httpPaymentError(`Un cobro no puede tener más de ${MAX_METHOD_SPLITS} métodos.`);
  }

  const seen = new Set();
  const splits = [];

  for (let index = 0; index < rawSplits.length; index += 1) {
    const raw = rawSplits[index] ?? {};
    const paymentMethodId = parseInt(raw.paymentMethodId, 10);
    if (!Number.isFinite(paymentMethodId) || paymentMethodId < 1) {
      throw httpPaymentError(`Método ${index + 1}: indica un método de pago válido.`);
    }
    if (seen.has(paymentMethodId)) {
      throw httpPaymentError('No se puede repetir el mismo método de pago en un cobro.');
    }
    seen.add(paymentMethodId);

    const amountNum = Number(raw.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw httpPaymentError(`Método ${index + 1}: el monto debe ser mayor a 0.`);
    }

    splits.push({
      paymentMethodId,
      amount: toMoneyNumber(amountNum),
    });
  }

  return splits;
}

/**
 * Resuelve splits desde create body:
 * - methodSplits[] tiene prioridad
 * - paymentMethodId suelto → 1 split = total del cobro (compat)
 *
 * @param {object} data
 * @param {unknown} paymentAmount total del cobro (suma de líneas)
 */
export function resolveMethodSplitsFromCreateBody(data = {}, paymentAmount) {
  const hasSplits = Array.isArray(data.methodSplits) && data.methodSplits.length > 0;
  const hasLegacy =
    data.paymentMethodId != null && String(data.paymentMethodId).trim() !== '';

  if (hasSplits) {
    const splits = normalizeMethodSplits(data.methodSplits);
    assertSplitsMatchAmount(splits, paymentAmount);
    return splits;
  }

  if (hasLegacy) {
    const paymentMethodId = parseInt(data.paymentMethodId, 10);
    if (!Number.isFinite(paymentMethodId) || paymentMethodId < 1) {
      throw httpPaymentError('Indica un método de pago válido.');
    }
    const amount = toMoneyNumber(paymentAmount);
    if (!(amount > 0)) {
      throw httpPaymentError('El total del cobro debe ser mayor a 0.');
    }
    return [{ paymentMethodId, amount }];
  }

  throw httpPaymentError('Indica un método de pago válido.');
}

/**
 * Σ splits === amount (centavos enteros, sin tolerancia).
 */
export function assertSplitsMatchAmount(splits, amount) {
  const splitCents = Math.round(sumSplitAmounts(splits) * 100);
  const amountCents = Math.round(moneyToNumber(amount) * 100);
  if (splitCents !== amountCents) {
    throw httpPaymentError(
      `La suma de métodos (${(splitCents / 100).toFixed(2)}) debe ser exactamente igual al total del cobro (${(amountCents / 100).toFixed(2)}).`
    );
  }
}

/**
 * @param {Array<{ id: number, isCash?: boolean }>} methods
 * @returns {Map<number, boolean>}
 */
export function buildIsCashLookup(methods = []) {
  const map = new Map();
  for (const method of methods) {
    map.set(method.id, Boolean(method.isCash));
  }
  return map;
}

/**
 * Porción en efectivo del cobro (suma de splits cuyo método tiene isCash).
 */
export function sumCashSplitAmount(splits = [], isCashByMethodId = new Map()) {
  const cents = splits.reduce((acc, split) => {
    if (!isCashByMethodId.get(split.paymentMethodId)) return acc;
    return acc + Math.round(moneyToNumber(split.amount) * 100);
  }, 0);
  return cents / 100;
}

/**
 * Recibido/vuelto solo sobre la porción en efectivo.
 * - Sin cash: amountTendered/changeGiven deben ir vacíos → null.
 * - Con cash: si no envían recibido, se asume exacto (tendered = cash, change = 0).
 * - Ingreso en caja = split.amount (no el tendered).
 *
 * @returns {{ amountTendered: import('@prisma/client').Prisma.Decimal | null, changeGiven: import('@prisma/client').Prisma.Decimal | null, cashSplitAmount: number }}
 */
export function computeTenderedAndChange({
  splits = [],
  isCashByMethodId = new Map(),
  amountTendered,
} = {}) {
  const cashSplitAmount = sumCashSplitAmount(splits, isCashByMethodId);
  const cashCents = Math.round(cashSplitAmount * 100);
  const hasCash = cashCents > 0;
  const tenderedProvided =
    amountTendered != null && String(amountTendered).trim() !== '';

  if (!hasCash) {
    if (tenderedProvided) {
      throw httpPaymentError(
        'Recibido/vuelto solo aplica cuando hay efectivo en el cobro.'
      );
    }
    return {
      amountTendered: null,
      changeGiven: null,
      cashSplitAmount: 0,
    };
  }

  if (!tenderedProvided) {
    return {
      amountTendered: toMoneyDecimal(cashSplitAmount),
      changeGiven: toMoneyDecimal(0),
      cashSplitAmount,
    };
  }

  const tendered = toMoneyNumber(amountTendered);
  const tenderedCents = Math.round(tendered * 100);
  if (tenderedCents < cashCents) {
    throw httpPaymentError(
      'El monto recibido en efectivo no puede ser menor que la porción en efectivo.'
    );
  }

  return {
    amountTendered: toMoneyDecimal(tendered),
    changeGiven: toMoneyDecimal((tenderedCents - cashCents) / 100),
    cashSplitAmount,
  };
}

/**
 * Opción B: void de línea solo si hay exactamente 1 método en el cobro.
 * Con >1 método → anular ticket completo.
 *
 * @param {Array<unknown>} methodSplits
 */
export function assertCanVoidLine(methodSplits = []) {
  const count = Array.isArray(methodSplits) ? methodSplits.length : 0;
  if (count > 1) {
    throw httpPaymentError(
      'No se puede anular una línea en un cobro con varios métodos de pago. Anula el ticket completo.',
      400,
      'MIXED_METHODS_VOID_LINE_FORBIDDEN'
    );
  }
}

/** Espejo de cabecera: primer método del split (compat listados legacy). */
export function primaryPaymentMethodId(splits = []) {
  return splits[0]?.paymentMethodId ?? null;
}

export function isMixedPaymentMethods(splits = []) {
  return Array.isArray(splits) && splits.length > 1;
}
