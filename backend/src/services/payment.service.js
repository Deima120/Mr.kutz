/**
 * Payment Service (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getPaymentMethods = async () => {
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true },
  });
  return methods;
};

export const getAll = async ({ dateFrom, dateTo, appointmentId, limit = 100, offset = 0 }) => {
  const where = {};
  if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo + 'T23:59:59.999Z') };
  if (appointmentId) where.appointmentId = parseInt(appointmentId, 10);

  const payments = await prisma.payment.findMany({
    where,
    include: {
      paymentMethod: { select: { name: true } },
      appointment: {
        select: {
          appointmentDate: true,
          startTime: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return payments.map((p) => ({
    id: p.id,
    appointment_id: p.appointmentId,
    amount: p.amount,
    payment_method_id: p.paymentMethodId,
    reference: p.reference,
    notes: p.notes,
    created_at: p.createdAt,
    payment_method_name: p.paymentMethod?.name,
    appointment_date: p.appointment?.appointmentDate,
    start_time: p.appointment?.startTime,
    client_first_name: p.appointment?.client?.firstName,
    client_last_name: p.appointment?.client?.lastName,
    service_name: p.appointment?.service?.name,
  }));
};

export const getTotalByDateRange = async (dateFrom, dateTo) => {
  const where = {};
  if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo + 'T23:59:59.999Z') };

  const result = await prisma.payment.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
  });
  return {
    total: result._sum?.amount ?? 0,
    count: result._count ?? 0,
  };
};

export const getById = async (id) => {
  const p = await prisma.payment.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      paymentMethod: { select: { name: true } },
      appointment: {
        select: {
          appointmentDate: true,
          startTime: true,
          clientId: true,
          serviceId: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true, price: true } },
        },
      },
    },
  });
  if (!p) return null;
  return {
    ...p,
    payment_method_name: p.paymentMethod?.name,
    appointment_date: p.appointment?.appointmentDate,
    start_time: p.appointment?.startTime,
    client_id: p.appointment?.clientId,
    service_id: p.appointment?.serviceId,
    client_first_name: p.appointment?.client?.firstName,
    client_last_name: p.appointment?.client?.lastName,
    service_name: p.appointment?.service?.name,
    service_price: p.appointment?.service?.price,
  };
};

export const create = async (data) => {
  const payment = await prisma.payment.create({
    data: {
      appointmentId: data.appointmentId ? parseInt(data.appointmentId, 10) : null,
      amount: parseFloat(data.amount),
      paymentMethodId: data.paymentMethodId ? parseInt(data.paymentMethodId, 10) : null,
      reference: data.reference || null,
      notes: data.notes || null,
      createdBy: data.createdBy ? parseInt(data.createdBy, 10) : null,
    },
  });
  return payment;
};

export const remove = async (id) => {
  await prisma.payment.delete({
    where: { id: parseInt(id, 10) },
  });
  return true;
};
