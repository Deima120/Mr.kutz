/**
 * Client Service - Gestión de clientes (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getAll = async ({ search, document, limit = 50, offset = 0 }) => {
  const parts = [];

  if (search?.trim()) {
    const q = search.trim();
    parts.push({
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { documentNumber: { contains: q, mode: 'insensitive' } },
        { documentType: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (document?.trim()) {
    const d = document.trim();
    parts.push({
      OR: [
        { documentNumber: { contains: d, mode: 'insensitive' } },
        { documentType: { contains: d, mode: 'insensitive' } },
      ],
    });
  }

  const where = parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { AND: parts };

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
        documentType: true,
        documentNumber: true,
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
    document_type: c.documentType,
    document_number: c.documentNumber,
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
        document_type: c.documentType,
        document_number: c.documentNumber,
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

function normDocType(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 40);
}

function normDocNumber(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 80);
}

function normNotes(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 500);
}

export const create = async (data) => {
  const client = await prisma.client.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      documentType: normDocType(data.documentType),
      documentNumber: normDocNumber(data.documentNumber),
      notes: normNotes(data.notes),
      userId: data.userId ? parseInt(data.userId, 10) : null,
    },
  });
  return toSnake(client);
};

export const update = async (id, data) => {
  const patch = {};
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.email !== undefined) patch.email = data.email || null;
  if (data.documentType !== undefined) patch.documentType = normDocType(data.documentType);
  if (data.documentNumber !== undefined) patch.documentNumber = normDocNumber(data.documentNumber);
  if (data.notes !== undefined) patch.notes = normNotes(data.notes);

  const client = await prisma.client.update({
    where: { id: parseInt(id, 10) },
    data: patch,
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
