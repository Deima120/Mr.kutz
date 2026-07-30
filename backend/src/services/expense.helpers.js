/**
 * Helpers de gastos operativos (sin I/O). Totales por categoría en centavos.
 */

import { extractAppointmentDateYmd } from '../utils/colombiaTime.js';
import { moneyToNumber } from './payment.lines.helpers.js';

export function httpExpenseError(message, statusCode = 400, reason = null, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  if (details != null) err.details = details;
  return err;
}

/** YYYY-MM-DD desde Date @db.Date o string. */
export function expenseDateToYmd(value) {
  return extractAppointmentDateYmd(value) || '';
}

/**
 * Agrega montos de gastos vigentes (voidedAt null) por categoría.
 * Usa centavos enteros para evitar drift de float.
 *
 * @param {Array<object>} expenses
 */
export function aggregateExpenseTotals(expenses = []) {
  const byCategory = new Map();
  let totalCents = 0;
  let expenseCount = 0;

  for (const expense of expenses) {
    if (expense?.voidedAt) continue;
    const cents = Math.round(moneyToNumber(expense.amount) * 100);
    totalCents += cents;
    expenseCount += 1;

    const categoryId = expense.categoryId ?? expense.category?.id ?? null;
    const key = categoryId != null ? String(categoryId) : 'none';
    const prev = byCategory.get(key) || {
      categoryId: categoryId != null ? Number(categoryId) : null,
      categoryName: expense.category?.name ?? null,
      amountCents: 0,
      count: 0,
    };
    prev.amountCents += cents;
    prev.count += 1;
    if (expense.category?.name) prev.categoryName = expense.category.name;
    byCategory.set(key, prev);
  }

  const byCategoryList = [...byCategory.values()]
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      amount: row.amountCents / 100,
      count: row.count,
    }))
    .sort((a, b) => {
      const aid = a.categoryId ?? 0;
      const bid = b.categoryId ?? 0;
      return aid - bid;
    });

  return {
    expenseCount,
    totalAmount: totalCents / 100,
    byCategory: byCategoryList,
  };
}

export function toExpenseCategoryDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    isActive: Boolean(row.isActive),
    sortOrder: row.sortOrder ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toExpenseDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    amount: moneyToNumber(row.amount),
    expenseDate: expenseDateToYmd(row.expenseDate),
    notes: row.notes ?? null,
    attachmentUrl: row.attachmentUrl ?? null,
    reference: row.reference ?? null,
    createdById: row.createdById,
    createdByEmail: row.createdBy?.email ?? null,
    createdAt: row.createdAt,
    voidedAt: row.voidedAt ?? null,
    voidReason: row.voidReason ?? null,
    voidedById: row.voidedById ?? null,
    voidedByEmail: row.voidedBy?.email ?? null,
  };
}
