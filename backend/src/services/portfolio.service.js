/**
 * Portfolio (cartera) — citas completed sin cobro de servicio activo.
 */

import prisma from '../lib/prisma.js';
import { ymdToUtcDate } from '../utils/colombiaTime.js';
import { businessDateToYmd } from './cashRegister.helpers.js';
import { moneyToNumber } from './payment.lines.helpers.js';

/**
 * Citas completed en rango de appointmentDate sin PaymentLine service vigente.
 * Incluye estimatedAmount desde el precio del servicio.
 */
export async function listUnpaidCompletedAppointments({
  dateFrom,
  dateTo,
  barberId,
} = {}) {
  const where = {
    status: 'completed',
    paymentLines: {
      none: {
        lineType: 'service',
        voidedAt: null,
      },
    },
  };

  const fromYmd = dateFrom ? String(dateFrom).trim() : '';
  const toYmd = dateTo ? String(dateTo).trim() : '';
  if (fromYmd || toYmd) {
    where.appointmentDate = {};
    if (fromYmd) where.appointmentDate.gte = ymdToUtcDate(fromYmd);
    if (toYmd) where.appointmentDate.lte = ymdToUtcDate(toYmd);
  }

  const bid = barberId != null && String(barberId).trim() !== ''
    ? parseInt(barberId, 10)
    : null;
  if (Number.isFinite(bid) && bid >= 1) {
    where.barberId = bid;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, price: true } },
      barber: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
  });

  const items = appointments.map((a) => ({
    id: a.id,
    clientName: `${a.client?.firstName || ''} ${a.client?.lastName || ''}`.trim() || '—',
    serviceName: a.service?.name || 'Servicio',
    barberId: a.barberId,
    barberName: a.barber
      ? `${a.barber.firstName || ''} ${a.barber.lastName || ''}`.trim()
      : null,
    appointmentDate: businessDateToYmd(a.appointmentDate),
    startTime: a.startTime,
    estimatedAmount: moneyToNumber(a.service?.price),
  }));

  const totalEstimatedCents = items.reduce(
    (acc, row) => acc + Math.round(Number(row.estimatedAmount || 0) * 100),
    0
  );

  return {
    items,
    count: items.length,
    totalEstimated: totalEstimatedCents / 100,
  };
}
