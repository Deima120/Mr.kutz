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
 */
export const createPublicBooking = async ({
  firstName,
  lastName,
  email,
  phone,
  barberId,
  serviceId,
  appointmentDate,
  startTime,
  notes,
}) => {
  const slots = await appointmentService.getAvailableSlots(barberId, appointmentDate);
  if (!slots.includes(startTime)) {
    const err = new Error('La hora seleccionada ya no está disponible. Elige otra.');
    err.statusCode = 409;
    throw err;
  }

  const client = await resolveClient({ firstName, lastName, email, phone });

  return appointmentService.create({
    clientId: client.id,
    barberId,
    serviceId,
    appointmentDate,
    startTime,
    notes,
  });
};
