/**
 * Barber Service - Gestión de barberos (Prisma)
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

const SALT_ROUNDS = 10;

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
  const { email, password, firstName, lastName, phone, specialties } = data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const role = await prisma.role.findUnique({
    where: { name: 'barber' },
  });
  if (!role) {
    const err = new Error('Barber role not found');
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
    specialties: result.barber.specialties,
    is_active: result.barber.isActive,
    created_at: result.barber.createdAt,
    email: result.user.email,
  };
};

export const update = async (id, data) => {
  const barber = await prisma.barber.update({
    where: { id: parseInt(id, 10) },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      specialties: data.specialties,
      isActive: data.isActive,
    },
    include: { user: { select: { email: true } } },
  });
  return {
    id: barber.id,
    user_id: barber.userId,
    first_name: barber.firstName,
    last_name: barber.lastName,
    phone: barber.phone,
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
