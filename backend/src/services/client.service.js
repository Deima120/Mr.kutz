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
  const docType = normDocType(data.documentType);
  const docNum = normDocNumber(data.documentNumber);
  if (!docType || !docNum) {
    const err = new Error('El tipo y número de documento son obligatorios.');
    err.statusCode = 400;
    throw err;
  }

  if (!data.email || !String(data.email).trim()) {
    const err = new Error('El correo es obligatorio.');
    err.statusCode = 400;
    throw err;
  }

  // Validar que el documento sea único
  const existingDocClient = await prisma.client.findFirst({
    where: {
      documentType: docType,
      documentNumber: docNum,
    },
  });
  if (existingDocClient) {
    const err = new Error('Ya existe un cliente con este documento.');
    err.statusCode = 409;
    throw err;
  }

  // Validar que el correo sea único
  const existingEmailClient = await prisma.client.findFirst({
    where: {
      email: String(data.email).trim().toLowerCase(),
    },
  });
  if (existingEmailClient) {
    const err = new Error('Ya existe un cliente con este correo.');
    err.statusCode = 409;
    throw err;
  }

  const client = await prisma.client.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: String(data.email).trim().toLowerCase(),
      documentType: docType,
      documentNumber: docNum,
      notes: normNotes(data.notes),
      userId: data.userId ? parseInt(data.userId, 10) : null,
    },
  });
  return toSnake(client);
};

export const update = async (id, data) => {
  const clientId = parseInt(id, 10);
  const patch = {};
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.email !== undefined) {
    if (!data.email || !String(data.email).trim()) {
      const err = new Error('El correo es obligatorio.');
      err.statusCode = 400;
      throw err;
    }
    const emailLower = String(data.email).trim().toLowerCase();
    // Validar que el correo no exista en otro cliente
    const existingEmailClient = await prisma.client.findFirst({
      where: {
        email: emailLower,
        NOT: { id: clientId },
      },
    });
    if (existingEmailClient) {
      const err = new Error('Ya existe otro cliente con este correo.');
      err.statusCode = 409;
      throw err;
    }
    patch.email = emailLower;
  }
  if (data.documentType !== undefined || data.documentNumber !== undefined) {
    const docType = normDocType(data.documentType);
    const docNum = normDocNumber(data.documentNumber);
    if (!docType || !docNum) {
      const err = new Error('El tipo y número de documento son obligatorios.');
      err.statusCode = 400;
      throw err;
    }
    // Validar que el documento no exista en otro cliente
    const existingDocClient = await prisma.client.findFirst({
      where: {
        documentType: docType,
        documentNumber: docNum,
        NOT: { id: clientId },
      },
    });
    if (existingDocClient) {
      const err = new Error('Ya existe otro cliente con este documento.');
      err.statusCode = 409;
      throw err;
    }
    patch.documentType = docType;
    patch.documentNumber = docNum;
  }
  if (data.notes !== undefined) patch.notes = normNotes(data.notes);

  const client = await prisma.client.update({
    where: { id: clientId },
    data: patch,
  });
  return toSnake(client);
};

export const remove = async (id) => {
  const clientId = parseInt(id, 10);
  const appointmentCount = await prisma.appointment.count({
    where: { clientId },
  });
  if (appointmentCount > 0) {
    const err = new Error(
      `No se puede eliminar el cliente porque tiene ${appointmentCount} cita(s) registrada(s).`
    );
    err.statusCode = 409;
    throw err;
  }
  await prisma.client.delete({ where: { id: clientId } });
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
