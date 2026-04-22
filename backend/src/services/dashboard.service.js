/**
 * Dashboard Service (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getStats = async (dateFrom, dateTo) => {
  const from = dateFrom || new Date().toISOString().slice(0, 10);
  const to = dateTo || from;

  const fromDate = new Date(from);
  const toDate = new Date(to + 'T23:59:59.999Z');

  const [sales, appointments, servicesTop, barbersTop, lowStock, clientsCount] = await Promise.all([
    prisma.payment.aggregate({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { appointmentDate: { gte: fromDate, lte: toDate } },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: fromDate, lte: toDate },
        status: 'completed',
      },
      include: { service: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: fromDate, lte: toDate },
        status: 'completed',
      },
      include: { barber: { select: { firstName: true, lastName: true } } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { inventory: true },
    }),
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

  const lowStockCount = lowStock.filter(
    (p) => (p.inventory?.quantity ?? 0) <= (p.minStock ?? 0)
  ).length;

  return {
    sales: {
      total: Number(sales._sum?.amount ?? 0),
      count: sales._count ?? 0,
    },
    appointments: { completed, pending, total },
    topServices,
    topBarbers,
    lowStockCount,
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
  const from = dateFrom || new Date().toISOString().slice(0, 10);
  const to = dateTo || from;

  const [current, prev] = await Promise.all([
    getStats(from, to),
    (async () => {
      const { from: pFrom, to: pTo } = previousRange(from, to);
      return getStats(pFrom, pTo);
    })(),
  ]);

  const [fy, fm, fd] = String(from).split('-').map(Number);
  const [ty, tm, td] = String(to).split('-').map(Number);
  const fromDate = new Date(Date.UTC(fy, (fm || 1) - 1, fd || 1, 0, 0, 0));
  const toDateEnd = new Date(Date.UTC(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999));

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

/** Fecha local YYYY-MM-DD */
function formatYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ymdBounds(ymdStr) {
  const [y, m, d] = ymdStr.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
}

function ymdRangeBounds(fromStr, toStr) {
  const a = ymdBounds(fromStr);
  const b = ymdBounds(toStr);
  return { start: a.start, end: b.end };
}

/**
 * Métricas para el panel del barbero: ingresos (pagos ligados a sus citas), cortes completados,
 * clientes distintos atendidos, citas de hoy y serie 7 días.
 */
export const getBarberStats = async (barberId) => {
  const bid = parseInt(barberId, 10);
  if (!bid || Number.isNaN(bid)) return null;

  const now = new Date();
  const todayStr = formatYMD(now);

  const calDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = calDay.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(calDay);
  monday.setDate(calDay.getDate() + offset);
  const weekStartStr = formatYMD(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEndStr = formatYMD(sunday);

  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEndStr = formatYMD(lastDayMonth);

  const { start: dayS, end: dayE } = ymdBounds(todayStr);
  const { start: weekS, end: weekE } = ymdRangeBounds(weekStartStr, weekEndStr);
  const { start: monthS, end: monthE } = ymdRangeBounds(monthStartStr, monthEndStr);

  const barberWhere = { barberId: bid };

  const revenueBetween = async (start, end) => {
    const r = await prisma.payment.aggregate({
      where: {
        appointment: { is: barberWhere },
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
    return Number(r._sum?.amount ?? 0);
  };

  const cutsBetween = async (start, end) =>
    prisma.appointment.count({
      where: {
        ...barberWhere,
        status: 'completed',
        appointmentDate: { gte: start, lte: end },
      },
    });

  const distinctClientsBetween = async (start, end) => {
    const rows = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        ...barberWhere,
        status: 'completed',
        appointmentDate: { gte: start, lte: end },
      },
    });
    return rows.length;
  };

  const todayGroups = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      ...barberWhere,
      appointmentDate: { gte: dayS, lte: dayE },
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
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    chartDays.push(formatYMD(d));
  }
  const chartRangeStart = ymdBounds(chartDays[0]).start;

  const [revDay, revWeek, revMonth, cutsDay, cutsWeek, cutsMonth, cliDay, cliWeek, cliMonth, payList, completedList] =
    await Promise.all([
      revenueBetween(dayS, dayE),
      revenueBetween(weekS, weekE),
      revenueBetween(monthS, monthE),
      cutsBetween(dayS, dayE),
      cutsBetween(weekS, weekE),
      cutsBetween(monthS, monthE),
      distinctClientsBetween(dayS, dayE),
      distinctClientsBetween(weekS, weekE),
      distinctClientsBetween(monthS, monthE),
      prisma.payment.findMany({
        where: {
          appointment: { is: barberWhere },
          createdAt: { gte: chartRangeStart, lte: dayE },
        },
        select: { amount: true, createdAt: true },
      }),
      prisma.appointment.findMany({
        where: {
          ...barberWhere,
          status: 'completed',
          appointmentDate: { gte: chartRangeStart, lte: dayE },
        },
        select: { appointmentDate: true },
      }),
    ]);

  const revMap = Object.fromEntries(chartDays.map((k) => [k, 0]));
  const cutMap = Object.fromEntries(chartDays.map((k) => [k, 0]));

  payList.forEach((p) => {
    const k = formatYMD(new Date(p.createdAt));
    if (Object.prototype.hasOwnProperty.call(revMap, k)) revMap[k] += Number(p.amount);
  });
  completedList.forEach((a) => {
    const k = formatYMD(new Date(a.appointmentDate));
    if (Object.prototype.hasOwnProperty.call(cutMap, k)) cutMap[k] += 1;
  });

  const chart7d = chartDays.map((date) => ({
    date,
    label: new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
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
