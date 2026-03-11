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
      _count: true,
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

  const completed = appointments.find((g) => g.status === 'completed')?._count ?? 0;
  const pending = appointments
    .filter((g) => g.status && ['scheduled', 'confirmed', 'in_progress'].includes(g.status))
    .reduce((sum, g) => sum + (g._count ?? 0), 0);
  const total = appointments.reduce((sum, g) => sum + (g._count ?? 0), 0);

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
