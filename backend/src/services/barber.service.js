/**
 * Barber Service - Gestión de barberos (Prisma)
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { canonicalEmail } from '../utils/emailCanonical.js';

const SALT_ROUNDS = 10;

function normDocType(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 40);
}

function normDocNumber(v) {
  if (v == null || String(v).trim() === '') return null;
  return String(v).trim().slice(0, 80);
}

export const getAll = async ({ activeFilter = 'active', document } = {}) => {
  const parts = [];
  if (activeFilter === 'active') {
    parts.push({ isActive: true });
  } else if (activeFilter === 'inactive') {
    parts.push({ isActive: false });
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

  const barbers = await prisma.barber.findMany({
    where,
    include: { user: { select: { email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  return barbers.map((b) => toBarberDto(b));
};

function toBarberDto(barber) {
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
    commission_percent:
      barber.commissionPercent != null ? Number(barber.commissionPercent) : null,
    created_at: barber.createdAt,
    updated_at: barber.updatedAt,
    email: barber.user?.email,
  };
}

export const getById = async (id) => {
  const barber = await prisma.barber.findUnique({
    where: { id: parseInt(id, 10) },
    include: { user: { select: { email: true } } },
  });
  if (!barber) return null;
  return toBarberDto(barber);
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
  const emailNorm = canonicalEmail(email);

  const existing = await prisma.user.findUnique({
    where: { email: emailNorm },
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

  const docType = normDocType(documentType);
  const docNum = normDocNumber(documentNumber);
  if (!docType || !docNum) {
    const err = new Error('El tipo y número de documento son obligatorios.');
    err.statusCode = 400;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: emailNorm,
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
        documentType: docType,
        documentNumber: docNum,
        specialties: specialties || [],
      },
    });
    return { barber, user };
  });

  return toBarberDto({ ...result.barber, user: result.user });
};

export const update = async (id, data) => {
  const patch = {};
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.specialties !== undefined) patch.specialties = data.specialties;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.documentType !== undefined) {
    const v = normDocType(data.documentType);
    if (!v) {
      const err = new Error('El tipo de documento es obligatorio.');
      err.statusCode = 400;
      throw err;
    }
    patch.documentType = v;
  }
  if (data.documentNumber !== undefined) {
    const v = normDocNumber(data.documentNumber);
    if (!v) {
      const err = new Error('El número de documento es obligatorio.');
      err.statusCode = 400;
      throw err;
    }
    patch.documentNumber = v;
  }
  if (data.commissionPercent !== undefined) {
    if (data.commissionPercent === null || data.commissionPercent === '') {
      patch.commissionPercent = null;
    } else {
      const n = Number(data.commissionPercent);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        const err = new Error('El porcentaje de comisión debe estar entre 0 y 100.');
        err.statusCode = 400;
        throw err;
      }
      patch.commissionPercent = n;
    }
  }

  const barber = await prisma.barber.update({
    where: { id: parseInt(id, 10) },
    data: patch,
    include: { user: { select: { email: true } } },
  });
  return toBarberDto(barber);
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
