/**
 * Client Service - Gestión de clientes (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getAll = async ({ search, limit = 50, offset = 0 }) => {
  const where = search?.trim()
    ? {
        OR: [
          { firstName: { contains: search.trim(), mode: 'insensitive' } },
          { lastName: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { phone: { contains: search.trim(), mode: 'insensitive' } },
        ],
      }
    : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        notes: true,
        createdAt: true,
      },
    }),
    prisma.client.count({ where }),
  ]);

  const mapped = clients.map((c) => ({
    id: c.id,
    user_id: c.userId,
    first_name: c.firstName,
    last_name: c.lastName,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    created_at: c.createdAt,
  }));
  return { clients: mapped, total, limit, offset };
};

const toSnake = (c) =>
  c
    ? {
        id: c.id,
        user_id: c.userId,
        first_name: c.firstName,
        last_name: c.lastName,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }
    : null;

export const getById = async (id) => {
  const client = await prisma.client.findUnique({
    where: { id: parseInt(id, 10) },
  });
  return toSnake(client);
};

export const create = async (data) => {
  const client = await prisma.client.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
      userId: data.userId ? parseInt(data.userId, 10) : null,
    },
  });
  return toSnake(client);
};

export const update = async (id, data) => {
  const client = await prisma.client.update({
    where: { id: parseInt(id, 10) },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    },
  });
  return toSnake(client);
};

export const remove = async (id) => {
  await prisma.client.delete({
    where: { id: parseInt(id, 10) },
  });
  return true;
};

export const getServiceHistory = async (clientId) => {
  const appointments = await prisma.appointment.findMany({
    where: { clientId: parseInt(clientId, 10) },
    include: {
      service: { select: { name: true, price: true, durationMinutes: true } },
      barber: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
    take: 100,
  });
  return appointments.map((a) => ({
    id: a.id,
    appointment_date: a.appointmentDate,
    start_time: a.startTime,
    end_time: a.endTime,
    status: a.status,
    notes: a.notes,
    service_name: a.service.name,
    price: a.service.price,
    duration_minutes: a.service.durationMinutes,
    barber_first_name: a.barber.firstName,
    barber_last_name: a.barber.lastName,
  }));
};
