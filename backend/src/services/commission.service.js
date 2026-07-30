/**
 * Commission Service — listado y totales de comisiones.
 */

import prisma from '../lib/prisma.js';
import { applyColombiaCreatedAtFilter } from '../utils/colombiaTime.js';
import { moneyToNumber } from './payment.lines.helpers.js';

function toCommissionDto(entry) {
  return {
    id: entry.id,
    paymentId: entry.paymentId,
    paymentLineId: entry.paymentLineId,
    appointmentId: entry.appointmentId,
    barberId: entry.barberId,
    barberName: entry.barber
      ? `${entry.barber.firstName || ''} ${entry.barber.lastName || ''}`.trim()
      : null,
    serviceAmount: moneyToNumber(entry.serviceAmount),
    commissionPercent: moneyToNumber(entry.commissionPercent),
    commissionAmount: moneyToNumber(entry.commissionAmount),
    createdAt: entry.createdAt,
    voidedAt: entry.voidedAt,
    clientName: entry.appointment?.client
      ? `${entry.appointment.client.firstName || ''} ${entry.appointment.client.lastName || ''}`.trim()
      : null,
    serviceName: entry.appointment?.service?.name || null,
  };
}

/**
 * Lista comisiones vigentes (no anuladas) con totales y desglose por barbero.
 */
export async function listCommissions({
  dateFrom,
  dateTo,
  barberId,
  limit = 50,
  offset = 0,
} = {}) {
  const where = { voidedAt: null };
  applyColombiaCreatedAtFilter(where, dateFrom, dateTo);

  const bid = barberId != null && String(barberId).trim() !== ''
    ? parseInt(barberId, 10)
    : null;
  if (Number.isFinite(bid) && bid >= 1) {
    where.barberId = bid;
  }

  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);

  const include = {
    barber: { select: { id: true, firstName: true, lastName: true } },
    appointment: {
      select: {
        client: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
    },
  };

  const [entries, aggregate, byBarberRows] = await Promise.all([
    prisma.commissionEntry.findMany({
      where,
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      skip,
    }),
    prisma.commissionEntry.aggregate({
      where,
      _sum: { commissionAmount: true },
      _count: true,
    }),
    prisma.commissionEntry.groupBy({
      by: ['barberId'],
      where,
      _sum: { commissionAmount: true },
      _count: true,
    }),
  ]);

  const barberIds = byBarberRows.map((r) => r.barberId);
  const barbers = barberIds.length
    ? await prisma.barber.findMany({
        where: { id: { in: barberIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const barberNameById = new Map(
    barbers.map((b) => [b.id, `${b.firstName || ''} ${b.lastName || ''}`.trim()])
  );

  const byBarber = byBarberRows
    .map((row) => ({
      barberId: row.barberId,
      barberName: barberNameById.get(row.barberId) || null,
      totalCommission: moneyToNumber(row._sum?.commissionAmount),
      count: row._count ?? 0,
    }))
    .sort((a, b) => a.barberId - b.barberId);

  return {
    entries: entries.map(toCommissionDto),
    total: aggregate._count ?? 0,
    limit: take,
    offset: skip,
    totals: {
      totalCommission: moneyToNumber(aggregate._sum?.commissionAmount),
      count: aggregate._count ?? 0,
      byBarber,
    },
  };
}
