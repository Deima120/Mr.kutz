/**
 * Cash Register Service — apertura / cierre / resumen diario.
 */

import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import {
  getColombiaTodayYmd,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';
import { runSerializable } from './inventory.helpers.js';
import {
  moneyToNumber,
  toMoneyDecimal,
} from './payment.lines.helpers.js';
import {
  aggregateCashRegisterSummary,
  businessDateToYmd,
  httpCashError,
  mapUnpaidCompletedAppointments,
  toCashRegisterDto,
  toLiveSummaryDto,
} from './cashRegister.helpers.js';
import { toExpenseDto } from './expense.helpers.js';
import { toOtherIncomeDto } from './otherIncome.helpers.js';

const registerInclude = {
  openedBy: { select: { id: true, email: true } },
  closedBy: { select: { id: true, email: true } },
};

const paymentSplitsInclude = {
  methodSplits: {
    include: {
      paymentMethod: {
        select: { id: true, name: true, description: true, isCash: true },
      },
    },
  },
};

function toCommissionSummaryDto(entry) {
  return {
    id: entry.id,
    paymentId: entry.paymentId,
    barberId: entry.barberId,
    barberName: entry.barber
      ? `${entry.barber.firstName || ''} ${entry.barber.lastName || ''}`.trim()
      : null,
    serviceAmount: moneyToNumber(entry.serviceAmount),
    commissionPercent: moneyToNumber(entry.commissionPercent),
    commissionAmount: moneyToNumber(entry.commissionAmount),
    clientName: entry.appointment?.client
      ? `${entry.appointment.client.firstName || ''} ${entry.appointment.client.lastName || ''}`.trim()
      : null,
    serviceName: entry.appointment?.service?.name || null,
  };
}

function aggregateCommissionsByBarber(entries = []) {
  const map = new Map();
  for (const e of entries) {
    const prev = map.get(e.barberId) || {
      barberId: e.barberId,
      barberName: e.barberName,
      totalCommission: 0,
      count: 0,
    };
    prev.totalCommission = Math.round((prev.totalCommission + e.commissionAmount) * 100) / 100;
    prev.count += 1;
    if (e.barberName) prev.barberName = e.barberName;
    map.set(e.barberId, prev);
  }
  return [...map.values()].sort((a, b) => a.barberId - b.barberId);
}

function parseOpeningAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw httpCashError('Indica un monto base de apertura válido (≥ 0).');
  }
  return toMoneyDecimal(n);
}

async function findOpenRegister(tx = prisma) {
  return tx.cashRegister.findFirst({
    where: { status: 'OPEN' },
    include: registerInclude,
    orderBy: { openedAt: 'asc' },
  });
}

async function loadUnpaidCompletedForBusinessDate(tx, businessDate) {
  const appointments = await tx.appointment.findMany({
    where: {
      appointmentDate: businessDate,
      status: 'completed',
      paymentLines: {
        none: {
          lineType: 'service',
          voidedAt: null,
        },
      },
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
  });
  return mapUnpaidCompletedAppointments(appointments);
}

async function loadPaymentsAndOtherIncomes(tx, registerId) {
  return Promise.all([
    tx.payment.findMany({
      where: {
        cashRegisterId: registerId,
        voidedAt: null,
      },
      include: paymentSplitsInclude,
      orderBy: { id: 'asc' },
    }),
    tx.otherIncome.findMany({
      where: {
        cashRegisterId: registerId,
        voidedAt: null,
      },
      include: {
        paymentMethod: {
          select: { id: true, name: true, isCash: true },
        },
        createdBy: { select: { id: true, email: true } },
      },
      orderBy: { id: 'asc' },
    }),
  ]);
}

async function buildSummaryForRegister(tx, register) {
  const [[payments, otherIncomes], expenses, commissionRows, unpaidAppointments] =
    await Promise.all([
      loadPaymentsAndOtherIncomes(tx, register.id),
      tx.expense.findMany({
        where: {
          expenseDate: register.businessDate,
          voidedAt: null,
        },
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, email: true } },
        },
        orderBy: [{ id: 'asc' }],
      }),
      tx.commissionEntry.findMany({
        where: {
          voidedAt: null,
          payment: {
            cashRegisterId: register.id,
            voidedAt: null,
          },
        },
        include: {
          barber: { select: { id: true, firstName: true, lastName: true } },
          appointment: {
            select: {
              client: { select: { firstName: true, lastName: true } },
              service: { select: { name: true } },
            },
          },
        },
        orderBy: [{ id: 'asc' }],
      }),
      loadUnpaidCompletedForBusinessDate(tx, register.businessDate),
    ]);

  const aggregated = aggregateCashRegisterSummary(
    payments,
    register.openingAmount,
    otherIncomes
  );
  const todayYmd = getColombiaTodayYmd();
  const dto = toCashRegisterDto(register, { todayYmd });
  const counted =
    register.countedCash != null ? moneyToNumber(register.countedCash) : null;
  const cashDifference =
    counted != null
      ? Math.round((counted - aggregated.expectedCash) * 100) / 100
      : null;

  const otherIncomeDtos = otherIncomes.map(toOtherIncomeDto);
  const expenseDtos = expenses.map(toExpenseDto);
  const commissionDtos = commissionRows.map(toCommissionSummaryDto);
  const otherIncomesTotal = Math.round(
    otherIncomeDtos.reduce((s, r) => s + r.amount, 0) * 100
  ) / 100;
  const expensesTotal = Math.round(
    expenseDtos.reduce((s, r) => s + r.amount, 0) * 100
  ) / 100;
  const commissionsTotal = Math.round(
    commissionDtos.reduce((s, r) => s + r.commissionAmount, 0) * 100
  ) / 100;

  return {
    register: dto,
    ...aggregated,
    countedCash: counted,
    cashDifference,
    sections: {
      cash: {
        openingAmount: dto.openingAmount,
        cashCollected: aggregated.cashCollected,
        cashOtherIncomes: aggregated.cashOtherIncomes,
        expectedCash: aggregated.expectedCash,
        countedCash: counted,
        cashDifference,
        notes: dto.notes,
        openedByEmail: dto.openedByEmail,
        closedByEmail: dto.closedByEmail,
        status: dto.status,
      },
      sales: {
        paymentCount: aggregated.paymentCount,
        totalAmount: aggregated.totalAmount,
        cashCollected: aggregated.cashCollected,
        byMethod: aggregated.byMethod,
      },
      otherIncomes: {
        items: otherIncomeDtos,
        total: otherIncomesTotal,
        count: otherIncomeDtos.length,
      },
      expenses: {
        items: expenseDtos,
        total: expensesTotal,
        count: expenseDtos.length,
      },
      commissions: {
        items: commissionDtos,
        total: commissionsTotal,
        count: commissionDtos.length,
        byBarber: aggregateCommissionsByBarber(commissionDtos),
      },
      portfolio: {
        items: unpaidAppointments,
        count: unpaidAppointments.length,
      },
    },
  };
}

/**
 * Abre caja del día Colombia. Falla si ya hay OPEN (incluye día anterior).
 */
export async function openCashRegister({ openingAmount, notes, openedById } = {}) {
  const amount = parseOpeningAmount(openingAmount);
  const actor = parseInt(openedById, 10);
  if (!Number.isFinite(actor) || actor < 1) {
    throw httpCashError('Usuario de apertura no válido.');
  }
  const todayYmd = getColombiaTodayYmd();
  const businessDate = ymdToUtcDate(todayYmd);
  const notesClean = String(notes || '').trim() || null;

  try {
    return await runSerializable(prisma, async (tx) => {
      const existingOpen = await tx.cashRegister.findFirst({
        where: { status: 'OPEN' },
        include: registerInclude,
      });
      if (existingOpen) {
        const openYmd = businessDateToYmd(existingOpen.businessDate);
        throw httpCashError(
          `Ya hay una caja abierta del ${openYmd}. Ciérrala antes de abrir una nueva.`,
          409,
          'CASH_REGISTER_ALREADY_OPEN',
          {
            openRegisterId: existingOpen.id,
            businessDate: openYmd,
          }
        );
      }

      const sameDay = await tx.cashRegister.findUnique({
        where: { businessDate },
      });
      if (sameDay) {
        throw httpCashError(
          `Ya existe una caja para el día ${todayYmd} (estado: ${sameDay.status}).`,
          409,
          'CASH_REGISTER_DAY_EXISTS',
          { businessDate: todayYmd, status: sameDay.status }
        );
      }

      const created = await tx.cashRegister.create({
        data: {
          businessDate,
          openingAmount: amount,
          openedById: actor,
          status: 'OPEN',
          notes: notesClean,
        },
        include: registerInclude,
      });
      return toCashRegisterDto(created, { todayYmd });
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw httpCashError(
        `Ya existe una caja para el día ${todayYmd}.`,
        409,
        'CASH_REGISTER_DAY_EXISTS',
        { businessDate: todayYmd }
      );
    }
    throw err;
  }
}

/**
 * Caja OPEN actual (o null). Incluye summary ligero para banner / polling.
 */
export async function getCurrentCashRegister() {
  const todayYmd = getColombiaTodayYmd();
  const open = await findOpenRegister(prisma);
  const register = toCashRegisterDto(open, { todayYmd });
  let summary = null;
  if (open) {
    const [payments, otherIncomes] = await loadPaymentsAndOtherIncomes(prisma, open.id);
    summary = toLiveSummaryDto(
      aggregateCashRegisterSummary(payments, open.openingAmount, otherIncomes)
    );
  }
  return {
    register,
    canCharge: Boolean(register),
    todayYmd,
    summary,
  };
}

/**
 * Exige caja OPEN (para create payment).
 */
export async function requireOpenCashRegister(tx = prisma) {
  const open = await findOpenRegister(tx);
  if (!open) {
    throw httpCashError(
      'No hay caja abierta. Abre la caja antes de registrar cobros.',
      409,
      'NO_OPEN_CASH_REGISTER'
    );
  }
  return open;
}

/**
 * Cierra la caja OPEN. Bloquea si hay citas completed del businessDate sin cobro.
 */
export async function closeCashRegister({ countedCash, notes, closedById } = {}) {
  const actor = parseInt(closedById, 10);
  if (!Number.isFinite(actor) || actor < 1) {
    throw httpCashError('Usuario de cierre no válido.');
  }

  let countedDec = null;
  if (countedCash != null && String(countedCash).trim() !== '') {
    const n = Number(countedCash);
    if (!Number.isFinite(n) || n < 0) {
      throw httpCashError('El efectivo contado debe ser un monto ≥ 0.');
    }
    countedDec = toMoneyDecimal(n);
  }

  const notesClean = String(notes || '').trim() || null;

  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "cash_registers" WHERE "status" = 'OPEN' FOR UPDATE`
    );

    const open = await tx.cashRegister.findFirst({
      where: { status: 'OPEN' },
      include: registerInclude,
    });
    if (!open) {
      throw httpCashError('No hay caja abierta para cerrar.', 409, 'NO_OPEN_CASH_REGISTER');
    }

    const unpaid = await loadUnpaidCompletedForBusinessDate(tx, open.businessDate);
    if (unpaid.length > 0) {
      throw httpCashError(
        `No se puede cerrar: hay ${unpaid.length} cita(s) completada(s) sin cobro.`,
        409,
        'UNPAID_COMPLETED_APPOINTMENTS',
        { unpaidAppointments: unpaid }
      );
    }

    const closed = await tx.cashRegister.update({
      where: { id: open.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: actor,
        countedCash: countedDec,
        notes: notesClean ?? open.notes,
      },
      include: registerInclude,
    });

    return buildSummaryForRegister(tx, closed);
  });
}

export async function getCashRegisterSummary(id) {
  const rid = parseInt(id, 10);
  if (!Number.isFinite(rid) || rid < 1) {
    throw httpCashError('ID de caja no válido.');
  }
  const register = await prisma.cashRegister.findUnique({
    where: { id: rid },
    include: registerInclude,
  });
  if (!register) {
    throw httpCashError('Caja no encontrada.', 404);
  }
  return buildSummaryForRegister(prisma, register);
}

export async function listCashRegisterHistory({
  limit = 20,
  offset = 0,
  dateFrom,
  dateTo,
  status,
} = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);
  const todayYmd = getColombiaTodayYmd();

  const where = {};
  if (status === 'OPEN' || status === 'CLOSED') {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    where.businessDate = {};
    if (dateFrom) where.businessDate.gte = ymdToUtcDate(String(dateFrom).trim());
    if (dateTo) where.businessDate.lte = ymdToUtcDate(String(dateTo).trim());
  }

  const [rows, total] = await Promise.all([
    prisma.cashRegister.findMany({
      where,
      include: registerInclude,
      orderBy: [{ businessDate: 'desc' }, { id: 'desc' }],
      take,
      skip,
    }),
    prisma.cashRegister.count({ where }),
  ]);

  const registers = rows.map((r) => toCashRegisterDto(r, { todayYmd }));

  // Totales del filtro (todas las filas que cumplen where, no solo la página)
  const allForTotals = await prisma.cashRegister.findMany({
    where,
    select: {
      id: true,
      openingAmount: true,
      countedCash: true,
      status: true,
    },
  });
  let openingSum = 0;
  let countedSum = 0;
  for (const r of allForTotals) {
    openingSum += moneyToNumber(r.openingAmount);
    if (r.countedCash != null) countedSum += moneyToNumber(r.countedCash);
  }

  return {
    registers,
    total,
    limit: take,
    offset: skip,
    totals: {
      registerCount: allForTotals.length,
      openingAmountSum: Math.round(openingSum * 100) / 100,
      countedCashSum: Math.round(countedSum * 100) / 100,
      closedCount: allForTotals.filter((r) => r.status === 'CLOSED').length,
      openCount: allForTotals.filter((r) => r.status === 'OPEN').length,
    },
  };
}
