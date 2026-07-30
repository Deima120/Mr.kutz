/**
 * Other Income Service — ingresos fuera de ventas (ligados a caja OPEN).
 */

import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import {
  getColombiaTodayYmd,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';
import { allocateDocumentFolio, DOC_TYPES } from '../utils/documentSequence.js';
import { assertVoidReason } from './payment.rules.js';
import { toMoneyDecimal } from './payment.lines.helpers.js';
import { runSerializable } from './inventory.helpers.js';
import { requireOpenCashRegister } from './cashRegister.service.js';
import {
  httpOtherIncomeError,
  toOtherIncomeDto,
} from './otherIncome.helpers.js';

const incomeInclude = {
  paymentMethod: { select: { id: true, name: true, isCash: true, isActive: true } },
  createdBy: { select: { id: true, email: true } },
  voidedBy: { select: { id: true, email: true } },
  cashRegister: { select: { id: true, businessDate: true, status: true } },
};

function parsePositiveAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw httpOtherIncomeError('El monto del ingreso debe ser mayor a 0.');
  }
  return toMoneyDecimal(n);
}

function parseIncomeDateYmd(value) {
  const raw =
    value != null && String(value).trim() !== ''
      ? String(value).trim()
      : getColombiaTodayYmd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw httpOtherIncomeError('Indica una fecha de ingreso válida (YYYY-MM-DD).');
  }
  return raw;
}

function buildOtherIncomesWhere({ dateFrom, dateTo, status, cashRegisterId, paymentMethodId } = {}) {
  const where = {};

  if (dateFrom || dateTo) {
    where.incomeDate = {};
    if (dateFrom) where.incomeDate.gte = ymdToUtcDate(String(dateFrom).trim());
    if (dateTo) where.incomeDate.lte = ymdToUtcDate(String(dateTo).trim());
  }

  if (status === 'active') where.voidedAt = null;
  if (status === 'voided') where.voidedAt = { not: null };

  if (cashRegisterId != null && String(cashRegisterId).trim() !== '') {
    const rid = parseInt(cashRegisterId, 10);
    if (!Number.isFinite(rid) || rid < 1) {
      throw httpOtherIncomeError('Caja no válida.');
    }
    where.cashRegisterId = rid;
  }

  if (paymentMethodId != null && String(paymentMethodId).trim() !== '') {
    const mid = parseInt(paymentMethodId, 10);
    if (!Number.isFinite(mid) || mid < 1) {
      throw httpOtherIncomeError('Método de pago no válido.');
    }
    where.paymentMethodId = mid;
  }

  return where;
}

export async function listOtherIncomes({
  dateFrom,
  dateTo,
  status,
  cashRegisterId,
  paymentMethodId,
  limit = 20,
  offset = 0,
} = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);
  const where = buildOtherIncomesWhere({
    dateFrom,
    dateTo,
    status,
    cashRegisterId,
    paymentMethodId,
  });

  const [rows, total] = await Promise.all([
    prisma.otherIncome.findMany({
      where,
      include: incomeInclude,
      orderBy: [{ incomeDate: 'desc' }, { id: 'desc' }],
      take,
      skip,
    }),
    prisma.otherIncome.count({ where }),
  ]);

  return {
    otherIncomes: rows.map(toOtherIncomeDto),
    total,
    limit: take,
    offset: skip,
  };
}

export async function createOtherIncome({
  amount,
  description,
  paymentMethodId,
  incomeDate,
  notes,
  createdById,
} = {}) {
  const amountDec = parsePositiveAmount(amount);
  const desc = String(description ?? '').trim();
  if (!desc) throw httpOtherIncomeError('La descripción es obligatoria.');
  if (desc.length > 200) {
    throw httpOtherIncomeError('La descripción no puede superar 200 caracteres.');
  }

  const mid = parseInt(paymentMethodId, 10);
  if (!Number.isFinite(mid) || mid < 1) {
    throw httpOtherIncomeError('Indica un método de pago válido.');
  }

  const dateYmd = parseIncomeDateYmd(incomeDate);
  const actor = parseInt(createdById, 10);
  if (!Number.isFinite(actor) || actor < 1) {
    throw httpOtherIncomeError('Usuario creador no válido.');
  }
  const notesClean = String(notes || '').trim() || null;

  return runSerializable(prisma, async (tx) => {
    const open = await requireOpenCashRegister(tx);

    const method = await tx.paymentMethod.findUnique({ where: { id: mid } });
    if (!method) throw httpOtherIncomeError('Método de pago no encontrado.', 404);
    if (!method.isActive) {
      throw httpOtherIncomeError('El método de pago está inactivo.', 409, 'PAYMENT_METHOD_INACTIVE');
    }

    const reference = await allocateDocumentFolio(tx, DOC_TYPES.other_income);

    const created = await tx.otherIncome.create({
      data: {
        amount: amountDec,
        incomeDate: ymdToUtcDate(dateYmd),
        description: desc,
        paymentMethodId: mid,
        cashRegisterId: open.id,
        reference,
        notes: notesClean,
        createdById: actor,
      },
      include: incomeInclude,
    });

    return toOtherIncomeDto(created);
  });
}

export async function voidOtherIncome(id, { voidReason, voidedById } = {}) {
  const oid = parseInt(id, 10);
  if (!Number.isFinite(oid) || oid < 1) {
    throw httpOtherIncomeError('ID de ingreso no válido.');
  }
  const reason = assertVoidReason(voidReason);
  const actor = voidedById ? parseInt(voidedById, 10) : null;
  const now = new Date();

  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "other_incomes" WHERE "id" = ${oid} FOR UPDATE`);

    const existing = await tx.otherIncome.findUnique({
      where: { id: oid },
      include: incomeInclude,
    });
    if (!existing) throw httpOtherIncomeError('Ingreso no encontrado.', 404);
    if (existing.voidedAt) {
      return toOtherIncomeDto(existing);
    }

    const updated = await tx.otherIncome.update({
      where: { id: oid },
      data: {
        voidedAt: now,
        voidReason: reason,
        voidedById: Number.isFinite(actor) ? actor : null,
      },
      include: incomeInclude,
    });

    return toOtherIncomeDto(updated);
  });
}
