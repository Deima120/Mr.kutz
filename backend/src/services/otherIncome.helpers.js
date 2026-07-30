/**
 * Helpers de otros ingresos (sin I/O).
 * Suma efectivo de otros ingresos para expectedCash de caja.
 */

import { extractAppointmentDateYmd } from '../utils/colombiaTime.js';
import { moneyToNumber } from './payment.lines.helpers.js';

export function httpOtherIncomeError(message, statusCode = 400, reason = null, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  if (details != null) err.details = details;
  return err;
}

/** YYYY-MM-DD desde Date @db.Date o string. */
export function incomeDateToYmd(value) {
  return extractAppointmentDateYmd(value) || '';
}

/**
 * Suma montos de otros ingresos vigentes en efectivo (centavos).
 * Criterio: voidedAt null y paymentMethod.isCash.
 *
 * @param {Array<{ amount?: unknown, voidedAt?: unknown, paymentMethod?: { isCash?: boolean }, isCash?: boolean }>} otherIncomes
 * @returns {number} monto en unidades (no centavos)
 */
export function sumCashOtherIncomes(otherIncomes = []) {
  let cents = 0;
  for (const row of otherIncomes) {
    if (row?.voidedAt) continue;
    const isCash = Boolean(row.paymentMethod?.isCash ?? row.isCash);
    if (!isCash) continue;
    cents += Math.round(moneyToNumber(row.amount) * 100);
  }
  return cents / 100;
}

export function toOtherIncomeDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    amount: moneyToNumber(row.amount),
    incomeDate: incomeDateToYmd(row.incomeDate),
    description: row.description,
    paymentMethodId: row.paymentMethodId,
    paymentMethodName: row.paymentMethod?.name ?? null,
    paymentMethodIsCash: Boolean(row.paymentMethod?.isCash),
    cashRegisterId: row.cashRegisterId,
    reference: row.reference ?? null,
    notes: row.notes ?? null,
    createdById: row.createdById,
    createdByEmail: row.createdBy?.email ?? null,
    createdAt: row.createdAt,
    voidedAt: row.voidedAt ?? null,
    voidReason: row.voidReason ?? null,
    voidedById: row.voidedById ?? null,
    voidedByEmail: row.voidedBy?.email ?? null,
  };
}
