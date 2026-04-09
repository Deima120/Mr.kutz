/**
 * Barber Service - Gestión de barberos (Prisma)
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

const SALT_ROUNDS = 10;

function normDocType(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 40);
}

function normDocNumber(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 80);
}

export const getAll = async ({ activeOnly = true } = {}) => {
  const barbers = await prisma.barber.findMany({
    where: activeOnly ? { isActive: true } : {},
    include: { user: { select: { email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  return barbers.map((b) => ({
    id: b.id,
    user_id: b.userId,
    first_name: b.firstName,
    last_name: b.lastName,
    phone: b.phone,
    document_type: b.documentType,
    document_number: b.documentNumber,
    specialties: b.specialties,
    is_active: b.isActive,
    created_at: b.createdAt,
    email: b.user.email,
  }));
};

export const getById = async (id) => {
  const barber = await prisma.barber.findUnique({
    where: { id: parseInt(id, 10) },
    include: { user: { select: { email: true } } },
  });
  if (!barber) return null;
  return {
    id: barber.id,
    user_id: barber.userId,
    first_name: barber.firstName,
    last_name: barber.lastName,
    phone: barber.phone,
    document_type: barber.documentType,
    document_number: barber.documentNumber,
    specialties: barber.specialties,
    is_active: barber.isActive,
    created_at: barber.createdAt,
    updated_at: barber.updatedAt,
    email: barber.user.email,
  };
};

export const getSchedules = async (barberId) => {
  const schedules = await prisma.barberSchedule.findMany({
    where: { barberId: parseInt(barberId, 10) },
    orderBy: { dayOfWeek: 'asc' },
  });
  return schedules.map((s) => ({
    id: s.id,
    day_of_week: s.dayOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
    is_available: s.isAvailable,
  }));
};

export const create = async (data) => {
  const { email, password, firstName, lastName, phone, specialties, documentType, documentNumber } = data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    const err = new Error('Este correo electrónico ya está registrado.');
    err.statusCode = 409;
    throw err;
  }

  const role = await prisma.role.findUnique({
    where: { name: 'barber' },
  });
  if (!role) {
    const err = new Error('No se encontró el rol de barbero.');
    err.statusCode = 500;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        roleId: role.id,
      },
    });
    const barber = await tx.barber.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phone: phone || null,
        documentType: normDocType(documentType),
        documentNumber: normDocNumber(documentNumber),
        specialties: specialties || [],
      },
    });
    return { barber, user };
  });

  return {
    id: result.barber.id,
    user_id: result.barber.userId,
    first_name: result.barber.firstName,
    last_name: result.barber.lastName,
    phone: result.barber.phone,
    document_type: result.barber.documentType,
    document_number: result.barber.documentNumber,
    specialties: result.barber.specialties,
    is_active: result.barber.isActive,
    created_at: result.barber.createdAt,
    email: result.user.email,
  };
};

export const update = async (id, data) => {
  const patch = {};
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.specialties !== undefined) patch.specialties = data.specialties;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.documentType !== undefined) patch.documentType = normDocType(data.documentType);
  if (data.documentNumber !== undefined) patch.documentNumber = normDocNumber(data.documentNumber);

  const barber = await prisma.barber.update({
    where: { id: parseInt(id, 10) },
    data: patch,
    include: { user: { select: { email: true } } },
  });
  return {
    id: barber.id,
    user_id: barber.userId,
    first_name: barber.firstName,
    last_name: barber.lastName,
    phone: barber.phone,
    document_type: barber.documentType,
    document_number: barber.documentNumber,
    specialties: barber.specialties,
    is_active: barber.isActive,
    created_at: barber.createdAt,
    updated_at: barber.updatedAt,
    email: barber.user.email,
  };
};

const toTimeDate = (s) => {
  if (!s) return new Date('1970-01-01T09:00:00');
  const str = typeof s === 'string' && s.length === 5 ? s + ':00' : String(s);
  return new Date('1970-01-01T' + str);
};

export const updateSchedules = async (barberId, schedules) => {
  const bid = parseInt(barberId, 10);
  await prisma.$transaction(async (tx) => {
    await tx.barberSchedule.deleteMany({ where: { barberId: bid } });
    for (const s of schedules) {
      await tx.barberSchedule.create({
        data: {
          barberId: bid,
          dayOfWeek: s.dayOfWeek,
          startTime: toTimeDate(s.startTime),
          endTime: toTimeDate(s.endTime),
          isAvailable: s.isAvailable !== false,
        },
      });
    }
  });
  return getSchedules(barberId);
};
