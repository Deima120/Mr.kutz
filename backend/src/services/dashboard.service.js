/**
 * Dashboard Service (Prisma)
 */

import prisma from '../lib/prisma.js';
import { getInventoryInsights } from './product.service.js';
import {
  APP_TIMEZONE,
  addDaysToYmd,
  colombiaDayBounds,
  colombiaRangeBounds,
  formatInstantYmdInColombia,
  getColombiaNowParts,
  getColombiaTodayYmd,
  getColombiaWeekday,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';

export const getStats = async (dateFrom, dateTo) => {
  const from = dateFrom || getColombiaTodayYmd();
  const to = dateTo || from;

  const { start: fromDate, end: toDate } = colombiaRangeBounds(from, to);
  const apptFrom = ymdToUtcDate(from);
  const apptTo = ymdToUtcDate(to);

  const [sales, appointments, servicesTop, barbersTop, inventoryInsights, clientsCount] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        voidedAt: null,
        createdAt: { gte: fromDate, lte: toDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { appointmentDate: { gte: apptFrom, lte: apptTo } },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: apptFrom, lte: apptTo },
        status: 'completed',
      },
      include: { service: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: apptFrom, lte: apptTo },
        status: 'completed',
      },
      include: { barber: { select: { firstName: true, lastName: true } } },
    }),
    getInventoryInsights(),
    prisma.client.count(),
  ]);

  const completed = appointments.find((g) => g.status === 'completed')?._count?._all ?? 0;
  const pending = appointments
    .filter((g) => g.status && ['scheduled', 'confirmed', 'in_progress'].includes(g.status))
    .reduce((sum, g) => sum + (g._count?._all ?? 0), 0);
  const total = appointments.reduce((sum, g) => sum + (g._count?._all ?? 0), 0);

  const svcCount = {};
  servicesTop.forEach((a) => {
    const n = a.service.name;
    svcCount[n] = (svcCount[n] || 0) + 1;
  });
  const topServices = Object.entries(svcCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const barberCount = {};
  barbersTop.forEach((a) => {
    const n = `${a.barber.firstName} ${a.barber.lastName}`;
    barberCount[n] = (barberCount[n] || 0) + 1;
  });
  const topBarbers = Object.entries(barberCount)
    .map(([name, count]) => {
      const [firstName, ...rest] = name.split(' ');
      return { first_name: firstName, last_name: rest.join(' '), count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const lowStockCount = inventoryInsights.lowStockCount ?? 0;

  return {
    sales: {
      total: Number(sales._sum?.amount ?? 0),
      count: sales._count ?? 0,
    },
    appointments: { completed, pending, total },
    topServices,
    topBarbers,
    lowStockCount,
    inventoryValue: inventoryInsights.inventoryValue ?? 0,
    lowStockAlerts: inventoryInsights.lowStockAlerts ?? [],
    totalClients: clientsCount,
    period: { from, to },
  };
};

function pctChange(current, previous) {
  const curr = Number(current || 0);
  const prev = Number(previous || 0);
  if (!Number.isFinite(curr)) return 0;
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function previousRange(fromStr, toStr) {
  const [fy, fm, fd] = String(fromStr).split('-').map(Number);
  const [ty, tm, td] = String(toStr).split('-').map(Number);
  const fromDate = new Date(Date.UTC(fy, (fm || 1) - 1, fd || 1));
  const toDate = new Date(Date.UTC(ty, (tm || 1) - 1, td || 1));
  const diffDays = Math.max(0, Math.round((toDate - fromDate) / (24 * 60 * 60 * 1000)));
  const prevTo = new Date(fromDate);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - diffDays);
  const toISOYmd = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { from: toISOYmd(prevFrom), to: toISOYmd(prevTo) };
}

/**
 * Reporte comparativo entre el periodo actual y el anterior de igual duración.
 * Incluye resumen de valoraciones del periodo.
 */
export const getReport = async (dateFrom, dateTo) => {
  const from = dateFrom || getColombiaTodayYmd();
  const to = dateTo || from;

  const [current, prev] = await Promise.all([
    getStats(from, to),
    (async () => {
      const { from: pFrom, to: pTo } = previousRange(from, to);
      return getStats(pFrom, pTo);
    })(),
  ]);

  const { start: fromDate, end: toDateEnd } = colombiaRangeBounds(from, to);

  const ratingsRows = await prisma.appointment.findMany({
    where: {
      status: 'completed',
      clientRating: { not: null },
      clientRatedAt: { gte: fromDate, lte: toDateEnd },
    },
    orderBy: { clientRatedAt: 'desc' },
    take: 25,
    include: {
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      barber: { select: { firstName: true, lastName: true } },
    },
  });

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of ratingsRows) {
    const v = Number(r.clientRating);
    if (v >= 1 && v <= 5) {
      distribution[v] += 1;
      sum += v;
    }
  }
  const count = ratingsRows.length;
  const average = count > 0 ? Math.round((sum / count) * 100) / 100 : null;

  const recent = ratingsRows.map((ap) => ({
    appointmentId: ap.id,
    clientName:
      [ap.client?.firstName, ap.client?.lastName].filter(Boolean).join(' ').trim() || 'Cliente',
    serviceName: ap.service?.name || '',
    barberName:
      [ap.barber?.firstName, ap.barber?.lastName].filter(Boolean).join(' ').trim() || '',
    rating: ap.clientRating,
    comment: ap.clientRatingComment,
    date: ap.clientRatedAt,
  }));

  const comparison = {
    salesTotal: pctChange(current.sales?.total, prev.sales?.total),
    salesCount: pctChange(current.sales?.count, prev.sales?.count),
    appointmentsCompleted: pctChange(
      current.appointments?.completed,
      prev.appointments?.completed
    ),
    appointmentsTotal: pctChange(current.appointments?.total, prev.appointments?.total),
  };

  return {
    current,
    previous: prev,
    comparison,
    ratings: { average, count, distribution, recent },
  };
};

/** @deprecated usar colombiaDayBounds / formatInstantYmdInColombia */
function formatYMD(d) {
  return formatInstantYmdInColombia(d);
}

function ymdBounds(ymdStr) {
  return colombiaDayBounds(ymdStr);
}

function ymdRangeBounds(fromStr, toStr) {
  return colombiaRangeBounds(fromStr, toStr);
}

/**
 * Métricas para el panel del barbero: ingresos (pagos ligados a sus citas), cortes completados,
 * clientes distintos atendidos, citas de hoy y serie 7 días.
 */
export const getBarberStats = async (barberId) => {
  const bid = parseInt(barberId, 10);
  if (!bid || Number.isNaN(bid)) return null;

  const now = new Date();
  const todayStr = getColombiaTodayYmd(now);
  const parts = getColombiaNowParts(now);

  const dow = getColombiaWeekday(now);
  const offset = dow === 0 ? -6 : 1 - dow;
  const weekStartStr = addDaysToYmd(todayStr, offset);
  const weekEndStr = addDaysToYmd(weekStartStr, 6);

  const monthStartStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-01`;
  const nextMonthStart =
    parts.month === 12
      ? `${parts.year + 1}-01-01`
      : `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-01`;
  const monthEndStr = addDaysToYmd(nextMonthStart, -1);

  const { start: dayS, end: dayE } = ymdBounds(todayStr);
  const { start: weekS, end: weekE } = ymdRangeBounds(weekStartStr, weekEndStr);
  const { start: monthS, end: monthE } = ymdRangeBounds(monthStartStr, monthEndStr);

  const apptDayS = ymdToUtcDate(todayStr);
  const apptDayE = ymdToUtcDate(todayStr);
  const apptWeekS = ymdToUtcDate(weekStartStr);
  const apptWeekE = ymdToUtcDate(weekEndStr);
  const apptMonthS = ymdToUtcDate(monthStartStr);
  const apptMonthE = ymdToUtcDate(monthEndStr);

  const barberWhere = { barberId: bid };

  /** Ingresos del barbero = líneas de servicio activas (soporta cobros multi-línea). */
  const serviceLineWhere = (start, end) => ({
    voidedAt: null,
    lineType: 'service',
    appointment: { is: barberWhere },
    payment: {
      is: {
        voidedAt: null,
        createdAt: { gte: start, lte: end },
      },
    },
  });

  const revenueBetween = async (start, end) => {
    const r = await prisma.paymentLine.aggregate({
      where: serviceLineWhere(start, end),
      _sum: { lineAmount: true },
    });
    return Number(r._sum?.lineAmount ?? 0);
  };

  const cutsBetween = async (startAppt, endAppt) =>
    prisma.appointment.count({
      where: {
        ...barberWhere,
        status: 'completed',
        appointmentDate: { gte: startAppt, lte: endAppt },
      },
    });

  const distinctClientsBetween = async (startAppt, endAppt) => {
    const rows = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        ...barberWhere,
        status: 'completed',
        appointmentDate: { gte: startAppt, lte: endAppt },
      },
    });
    return rows.length;
  };

  const todayGroups = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      ...barberWhere,
      appointmentDate: { gte: apptDayS, lte: apptDayE },
    },
    _count: { _all: true },
  });

  let todayTotal = 0;
  let todayCompleted = 0;
  let todayPending = 0;
  todayGroups.forEach((g) => {
    const c = g._count?._all ?? 0;
    todayTotal += c;
    if (g.status === 'completed') todayCompleted += c;
    else if (g.status && ['scheduled', 'confirmed', 'in_progress'].includes(g.status)) todayPending += c;
  });

  const chartDays = [];
  for (let i = 6; i >= 0; i--) {
    chartDays.push(addDaysToYmd(todayStr, -i));
  }
  const chartRangeStart = ymdBounds(chartDays[0]).start;
  const apptChartStart = ymdToUtcDate(chartDays[0]);

  const [revDay, revWeek, revMonth, cutsDay, cutsWeek, cutsMonth, cliDay, cliWeek, cliMonth, payList, completedList] =
    await Promise.all([
      revenueBetween(dayS, dayE),
      revenueBetween(weekS, weekE),
      revenueBetween(monthS, monthE),
      cutsBetween(apptDayS, apptDayE),
      cutsBetween(apptWeekS, apptWeekE),
      cutsBetween(apptMonthS, apptMonthE),
      distinctClientsBetween(apptDayS, apptDayE),
      distinctClientsBetween(apptWeekS, apptWeekE),
      distinctClientsBetween(apptMonthS, apptMonthE),
      prisma.paymentLine.findMany({
        where: serviceLineWhere(chartRangeStart, dayE),
        select: {
          lineAmount: true,
          payment: { select: { createdAt: true } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          ...barberWhere,
          status: 'completed',
          appointmentDate: { gte: apptChartStart, lte: apptDayE },
        },
        select: { appointmentDate: true },
      }),
    ]);

  const revMap = Object.fromEntries(chartDays.map((k) => [k, 0]));
  const cutMap = Object.fromEntries(chartDays.map((k) => [k, 0]));

  payList.forEach((line) => {
    const createdAt = line.payment?.createdAt;
    if (!createdAt) return;
    const k = formatInstantYmdInColombia(createdAt);
    if (Object.prototype.hasOwnProperty.call(revMap, k)) {
      revMap[k] += Number(line.lineAmount);
    }
  });
  completedList.forEach((a) => {
    const raw = a.appointmentDate;
    const ymd =
      raw instanceof Date
        ? `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, '0')}-${String(raw.getUTCDate()).padStart(2, '0')}`
        : String(raw || '').slice(0, 10);
    if (Object.prototype.hasOwnProperty.call(cutMap, ymd)) cutMap[ymd] += 1;
  });

  const chart7d = chartDays.map((date) => ({
    date,
    label: new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', {
      timeZone: APP_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
    }),
    revenue: Math.round(revMap[date] * 100) / 100,
    cuts: cutMap[date],
  }));

  return {
    role: 'barber',
    revenue: { day: revDay, week: revWeek, month: revMonth },
    cutsCompleted: { day: cutsDay, week: cutsWeek, month: cutsMonth },
    clientsServed: { day: cliDay, week: cliWeek, month: cliMonth },
    todayAppointments: {
      total: todayTotal,
      completed: todayCompleted,
      pending: todayPending,
    },
    chart7d,
    periodLabels: {
      week: `${weekStartStr} — ${weekEndStr}`,
      month: `${monthStartStr} — ${monthEndStr}`,
    },
  };
};
