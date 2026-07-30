/**
 * Expense Service — categorías y gastos operativos.
 */

import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import {
  getColombiaTodayYmd,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';
import { allocateDocumentFolio, DOC_TYPES } from '../utils/documentSequence.js';
import { assertVoidReason } from './payment.rules.js';
import { moneyToNumber, toMoneyDecimal } from './payment.lines.helpers.js';
import { runSerializable } from './inventory.helpers.js';
import {
  aggregateExpenseTotals,
  httpExpenseError,
  toExpenseCategoryDto,
  toExpenseDto,
} from './expense.helpers.js';

const categoryOrder = [{ sortOrder: 'asc' }, { name: 'asc' }];

const expenseInclude = {
  category: { select: { id: true, name: true, isActive: true } },
  createdBy: { select: { id: true, email: true } },
  voidedBy: { select: { id: true, email: true } },
};

function parsePositiveAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw httpExpenseError('El monto del gasto debe ser mayor a 0.');
  }
  return toMoneyDecimal(n);
}

function parseExpenseDateYmd(value) {
  const raw = value != null && String(value).trim() !== '' ? String(value).trim() : getColombiaTodayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw httpExpenseError('Indica una fecha de gasto válida (YYYY-MM-DD).');
  }
  return raw;
}

function normalizeCategoryName(name) {
  const n = String(name ?? '').trim();
  if (!n) throw httpExpenseError('El nombre de la categoría es obligatorio.');
  if (n.length > 100) throw httpExpenseError('El nombre no puede superar 100 caracteres.');
  return n;
}

export async function listCategories({ activeOnly = true } = {}) {
  const where = activeOnly ? { isActive: true } : {};
  const rows = await prisma.expenseCategory.findMany({
    where,
    orderBy: categoryOrder,
  });
  return rows.map(toExpenseCategoryDto);
}

export async function createCategory({ name, sortOrder, isActive } = {}) {
  const data = {
    name: normalizeCategoryName(name),
    isActive: isActive === undefined ? true : Boolean(isActive),
  };
  if (sortOrder != null && String(sortOrder).trim() !== '') {
    const s = parseInt(sortOrder, 10);
    if (!Number.isFinite(s)) throw httpExpenseError('sortOrder no válido.');
    data.sortOrder = s;
  }

  try {
    const row = await prisma.expenseCategory.create({ data });
    return toExpenseCategoryDto(row);
  } catch (err) {
    if (err?.code === 'P2002') {
      throw httpExpenseError('Ya existe una categoría con ese nombre.', 409, 'EXPENSE_CATEGORY_DUPLICATE');
    }
    throw err;
  }
}

export async function updateCategory(id, { name, sortOrder, isActive } = {}) {
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1) {
    throw httpExpenseError('ID de categoría no válido.');
  }

  const existing = await prisma.expenseCategory.findUnique({ where: { id: cid } });
  if (!existing) throw httpExpenseError('Categoría no encontrada.', 404);

  const patch = {};
  if (name !== undefined) patch.name = normalizeCategoryName(name);
  if (isActive !== undefined) patch.isActive = Boolean(isActive);
  if (sortOrder !== undefined && sortOrder !== null && String(sortOrder).trim() !== '') {
    const s = parseInt(sortOrder, 10);
    if (!Number.isFinite(s)) throw httpExpenseError('sortOrder no válido.');
    patch.sortOrder = s;
  }

  if (Object.keys(patch).length === 0) {
    return toExpenseCategoryDto(existing);
  }

  try {
    const row = await prisma.expenseCategory.update({ where: { id: cid }, data: patch });
    return toExpenseCategoryDto(row);
  } catch (err) {
    if (err?.code === 'P2002') {
      throw httpExpenseError('Ya existe una categoría con ese nombre.', 409, 'EXPENSE_CATEGORY_DUPLICATE');
    }
    throw err;
  }
}

function buildExpensesWhere({ dateFrom, dateTo, categoryId, status } = {}) {
  const where = {};

  if (dateFrom || dateTo) {
    where.expenseDate = {};
    if (dateFrom) where.expenseDate.gte = ymdToUtcDate(String(dateFrom).trim());
    if (dateTo) where.expenseDate.lte = ymdToUtcDate(String(dateTo).trim());
  }

  if (categoryId != null && String(categoryId).trim() !== '') {
    const cid = parseInt(categoryId, 10);
    if (!Number.isFinite(cid) || cid < 1) {
      throw httpExpenseError('Categoría no válida.');
    }
    where.categoryId = cid;
  }

  if (status === 'active') where.voidedAt = null;
  if (status === 'voided') where.voidedAt = { not: null };

  return where;
}

export async function listExpenses({
  dateFrom,
  dateTo,
  categoryId,
  status,
  limit = 20,
  offset = 0,
} = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);
  const where = buildExpensesWhere({ dateFrom, dateTo, categoryId, status });

  const [rows, total, allForTotals] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      take,
      skip,
    }),
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    expenses: rows.map(toExpenseDto),
    total,
    limit: take,
    offset: skip,
    totals: aggregateExpenseTotals(allForTotals),
  };
}

export async function createExpense({
  categoryId,
  amount,
  expenseDate,
  notes,
  attachmentUrl,
  createdById,
} = {}) {
  const cid = parseInt(categoryId, 10);
  if (!Number.isFinite(cid) || cid < 1) {
    throw httpExpenseError('Indica una categoría válida.');
  }
  const amountDec = parsePositiveAmount(amount);
  const dateYmd = parseExpenseDateYmd(expenseDate);
  const actor = parseInt(createdById, 10);
  if (!Number.isFinite(actor) || actor < 1) {
    throw httpExpenseError('Usuario creador no válido.');
  }
  const notesClean = String(notes || '').trim() || null;
  const attachmentClean = String(attachmentUrl || '').trim() || null;
  if (attachmentClean && attachmentClean.length > 500) {
    throw httpExpenseError('La URL del adjunto no puede superar 500 caracteres.');
  }

  return runSerializable(prisma, async (tx) => {
    const category = await tx.expenseCategory.findUnique({ where: { id: cid } });
    if (!category) throw httpExpenseError('Categoría no encontrada.', 404);
    if (!category.isActive) {
      throw httpExpenseError('La categoría está inactiva.', 409, 'EXPENSE_CATEGORY_INACTIVE');
    }

    const reference = await allocateDocumentFolio(tx, DOC_TYPES.expense);

    const created = await tx.expense.create({
      data: {
        categoryId: cid,
        amount: amountDec,
        expenseDate: ymdToUtcDate(dateYmd),
        notes: notesClean,
        attachmentUrl: attachmentClean,
        reference,
        createdById: actor,
      },
      include: expenseInclude,
    });

    return toExpenseDto(created);
  });
}

export async function voidExpense(id, { voidReason, voidedById } = {}) {
  const eid = parseInt(id, 10);
  if (!Number.isFinite(eid) || eid < 1) {
    throw httpExpenseError('ID de gasto no válido.');
  }
  const reason = assertVoidReason(voidReason);
  const actor = voidedById ? parseInt(voidedById, 10) : null;
  const now = new Date();

  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "expenses" WHERE "id" = ${eid} FOR UPDATE`);

    const existing = await tx.expense.findUnique({
      where: { id: eid },
      include: expenseInclude,
    });
    if (!existing) throw httpExpenseError('Gasto no encontrado.', 404);
    if (existing.voidedAt) {
      return toExpenseDto(existing);
    }

    const updated = await tx.expense.update({
      where: { id: eid },
      data: {
        voidedAt: now,
        voidReason: reason,
        voidedById: Number.isFinite(actor) ? actor : null,
      },
      include: expenseInclude,
    });

    return toExpenseDto(updated);
  });
}

/** Totales agregados sin paginar (mismo filtro que list). */
export async function getExpenseTotals({ dateFrom, dateTo, categoryId, status } = {}) {
  const where = buildExpensesWhere({ dateFrom, dateTo, categoryId, status });
  const rows = await prisma.expense.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
  });
  return aggregateExpenseTotals(rows);
}
