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

export const getAll = async ({ activeFilter = 'active', document, includePrivate = false } = {}) => {
  const parts = [];
  if (activeFilter === 'active') {
    parts.push({ isActive: true });
  } else if (activeFilter === 'inactive') {
    parts.push({ isActive: false });
  }
  // La búsqueda por documento solo tiene sentido para admin; abierta a todos permitía
  // enumerar cédulas del personal probando prefijos (`contains`).
  if (includePrivate && document?.trim()) {
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
  return barbers.map((b) => toBarberDto(b, { includePrivate }));
};

/**
 * DTO de barbero.
 *
 * `GET /api/barbers` lo consumen también barberos y clientes (lo necesitan para
 * agendar), así que por defecto devuelve solo lo público. Los datos personales
 * —cédula, teléfono, correo— y el porcentaje de comisión solo salen con
 * `includePrivate`, que el controller activa únicamente para admin.
 *
 * @param {object} barber registro Prisma
 * @param {{ includePrivate?: boolean }} [options]
 */
export function toBarberDto(barber, { includePrivate = false } = {}) {
  const publicFields = {
    id: barber.id,
    first_name: barber.firstName,
    last_name: barber.lastName,
    specialties: barber.specialties,
    is_active: barber.isActive,
  };

  if (!includePrivate) return publicFields;

  return {
    ...publicFields,
    user_id: barber.userId,
    phone: barber.phone,
    document_type: barber.documentType,
    document_number: barber.documentNumber,
    commission_percent:
      barber.commissionPercent != null ? Number(barber.commissionPercent) : null,
    created_at: barber.createdAt,
    updated_at: barber.updatedAt,
    email: barber.user?.email,
  };
}

export const getById = async (id, { includePrivate = false } = {}) => {
  const barber = await prisma.barber.findUnique({
    where: { id: parseInt(id, 10) },
    include: { user: { select: { email: true } } },
  });
  if (!barber) return null;
  return toBarberDto(barber, { includePrivate });
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

  // create/update son rutas solo-admin: devuelven la ficha completa.
  return toBarberDto({ ...result.barber, user: result.user }, { includePrivate: true });
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
  return toBarberDto(barber, { includePrivate: true });
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

/**
 * Elimina un barbero definitivamente.
 *
 * Solo se permite si NO tiene historial. `Appointment.barber` está declarado con
 * `onDelete: Cascade` en el schema, así que un borrado sin guarda arrastraría en
 * silencio todas las citas del barbero (y con ellas el rastro de sus ventas). Por
 * eso se cuenta primero y se responde 409, igual que hacen client.service.js y
 * service.service.js: para dar de baja a un barbero con historial se usa
 * `isActive: false`, no este borrado.
 *
 * Se borra el `User`, no el `Barber`: `Barber.user` es `onDelete: Cascade`, de modo
 * que la fila del barbero y sus `BarberSchedule` se van con él en una sola
 * operación atómica de la base de datos. Borrar solo el `Barber` dejaría una cuenta
 * huérfana con rol barbero capaz de seguir iniciando sesión sin perfil asociado.
 */
export const remove = async (id) => {
  const barberId = parseInt(id, 10);

  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { id: true, userId: true },
  });
  if (!barber) return false;

  const [appointmentCount, commissionCount] = await Promise.all([
    prisma.appointment.count({ where: { barberId } }),
    prisma.commissionEntry.count({ where: { barberId } }),
  ]);

  if (appointmentCount > 0 || commissionCount > 0) {
    const detalle = [
      appointmentCount > 0 ? `${appointmentCount} cita(s)` : null,
      commissionCount > 0 ? `${commissionCount} comisión(es)` : null,
    ]
      .filter(Boolean)
      .join(' y ');
    const err = new Error(
      `No se puede eliminar el barbero porque tiene ${detalle} en su historial. Desactívalo si ya no debe trabajar.`
    );
    err.statusCode = 409;
    throw err;
  }

  try {
    await prisma.user.delete({ where: { id: barber.userId } });
    return true;
  } catch (error) {
    // La cuenta del barbero puede figurar como autor de otros registros
    // (pagos, movimientos de inventario, compras) con FK Restrict.
    if (error?.code === 'P2003') {
      const err = new Error(
        'No se puede eliminar el barbero porque su cuenta está relacionada con otros registros del sistema. Desactívalo en su lugar.'
      );
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};
