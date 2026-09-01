/**
 * Reservas públicas sin autenticación.
 * Crea (o reutiliza) un Client por email y agenda la cita.
 */

import prisma from '../lib/prisma.js';
import * as appointmentService from './appointment.service.js';

/** Lista de barberos activos, solo datos públicos. */
export const listPublicBarbers = async () => {
  const barbers = await prisma.barber.findMany({
    where: { isActive: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialties: true,
    },
  });
  return barbers.map((b) => ({
    id: b.id,
    first_name: b.firstName,
    last_name: b.lastName,
    specialties: b.specialties || [],
  }));
};

/** Lista de servicios activos, solo datos necesarios para agendar. */
export const listPublicServices = async () => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      category: { select: { id: true, name: true } },
    },
  });
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    duration_minutes: s.durationMinutes,
    category_id: s.category?.id ?? null,
    category_name: s.category?.name ?? null,
  }));
};

/**
 * Crea o recupera el cliente por email + nombre básico.
 * Si existe por email, actualiza teléfono si cambia.
 */
async function resolveClient({ firstName, lastName, email, phone }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await prisma.client.findFirst({
    where: { email: normalizedEmail },
  });
  if (existing) {
    // Se corta antes de tocar nada: esta ruta no pide login, así que sin esta
    // comprobación un cliente inactivado seguiría reservando por aquí y la
    // inactivación sería puramente decorativa.
    if (!existing.isActive) {
      const err = new Error(
        'Esta cuenta no puede agendar citas por el momento. Contacta con la barbería.'
      );
      err.statusCode = 403;
      err.reason = 'CLIENT_INACTIVE';
      throw err;
    }
    if (phone && existing.phone !== phone) {
      await prisma.client.update({
        where: { id: existing.id },
        data: { phone },
      });
    }
    return existing;
  }
  return prisma.client.create({
    data: {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      phone: phone || null,
    },
  });
}

/**
 * Flujo principal: valida slot, crea/recupera cliente y agenda la cita.
 * Acepta `serviceIds` (1–3) o un solo `serviceId` legacy.
 */
export const createPublicBooking = async ({
  firstName,
  lastName,
  email,
  phone,
  barberId,
  serviceId,
  serviceIds,
  appointmentDate,
  startTime,
  notes,
}) => {
  const ids = Array.isArray(serviceIds) && serviceIds.length
    ? [...new Set(serviceIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0))]
    : serviceId != null
      ? [parseInt(serviceId, 10)].filter((n) => Number.isFinite(n) && n > 0)
      : [];

  if (!ids.length) {
    const err = new Error('Indica al menos un servicio válido.');
    err.statusCode = 400;
    throw err;
  }
  if (ids.length > 3) {
    const err = new Error('Para agendar más servicios debes crear otra cita.');
    err.statusCode = 400;
    throw err;
  }

  const serviceRecords = await prisma.service.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, durationMinutes: true },
  });
  if (serviceRecords.length !== ids.length) {
    const err = new Error('Uno o más servicios no existen o no están disponibles.');
    err.statusCode = 400;
    throw err;
  }

  const durationById = new Map(serviceRecords.map((s) => [s.id, Number(s.durationMinutes || 0)]));
  const durationMinutes = ids.reduce((sum, id) => sum + (durationById.get(id) || 0), 0);

  const slots = await appointmentService.getAvailableSlots(
    barberId,
    appointmentDate,
    null,
    durationMinutes > 0 ? durationMinutes : 30,
  );
  if (!slots.includes(startTime)) {
    const err = new Error('La hora seleccionada ya no está disponible. Elige otra.');
    err.statusCode = 409;
    throw err;
  }

  const client = await resolveClient({ firstName, lastName, email, phone });

  return appointmentService.create({
    clientId: client.id,
    barberId,
    serviceIds: ids,
    appointmentDate,
    startTime,
    notes,
  });
};
