/**
 * Appointment Service - Gestión de citas (Prisma)
 */

import prisma from '../lib/prisma.js';

/** Convierte Date o string de tiempo a "HH:MM" (misma zona que al guardar horarios del barbero) */
function toTimeStr(d) {
  if (!d) return '09:00';
  if (typeof d === 'string') {
    const match = d.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${String(match[1]).padStart(2, '0')}:${match[2]}` : '09:00';
  }
  if (d instanceof Date) {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(d);
  const match = s.match(/(\d{1,2}):(\d{2})/);
  return match ? `${String(match[1]).padStart(2, '0')}:${match[2]}` : '09:00';
}

export const getAll = async ({ date, dateFrom, dateTo, barberId, clientId, status, limit = 100, offset = 0 }) => {
  const where = {};

  if (dateFrom && dateTo) {
    where.appointmentDate = { gte: new Date(dateFrom), lte: new Date(dateTo) };
  } else if (date) {
    where.appointmentDate = new Date(date);
  }
  if (barberId) where.barberId = parseInt(barberId, 10);
  if (clientId) where.clientId = parseInt(clientId, 10);
  if (status) where.status = status;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      client: { select: { firstName: true, lastName: true } },
      barber: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, price: true, durationMinutes: true } },
    },
    orderBy: dateFrom && dateTo
      ? [{ appointmentDate: 'asc' }, { startTime: 'asc' }]
      : [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
    take: limit,
    skip: offset,
  });

  return appointments.map((a) => ({
    id: a.id,
    client_id: a.clientId,
    barber_id: a.barberId,
    service_id: a.serviceId,
    appointment_date: a.appointmentDate,
    start_time: a.startTime,
    end_time: a.endTime,
    status: a.status,
    notes: a.notes,
    created_at: a.createdAt,
    client_first_name: a.client.firstName,
    client_last_name: a.client.lastName,
    barber_first_name: a.barber.firstName,
    barber_last_name: a.barber.lastName,
    service_name: a.service.name,
    price: a.service.price,
    duration_minutes: a.service.durationMinutes,
    clientRating: a.clientRating,
    clientRatingComment: a.clientRatingComment,
    clientRatedAt: a.clientRatedAt,
  }));
};

export const getById = async (id) => {
  const a = await prisma.appointment.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      client: { select: { firstName: true, lastName: true, phone: true, email: true } },
      barber: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, price: true, durationMinutes: true } },
    },
  });
  if (!a) return null;
  return {
    id: a.id,
    client_id: a.clientId,
    barber_id: a.barberId,
    service_id: a.serviceId,
    appointment_date: a.appointmentDate,
    start_time: a.startTime,
    end_time: a.endTime,
    status: a.status,
    notes: a.notes,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    client_first_name: a.client.firstName,
    client_last_name: a.client.lastName,
    client_phone: a.client.phone,
    client_email: a.client.email,
    barber_first_name: a.barber.firstName,
    barber_last_name: a.barber.lastName,
    service_name: a.service.name,
    price: a.service.price,
    duration_minutes: a.service.durationMinutes,
    clientRating: a.clientRating,
    clientRatingComment: a.clientRatingComment,
    clientRatedAt: a.clientRatedAt,
  };
};

/**
 * Valoración única por cita: solo cliente dueño, cita completada.
 */
export const submitClientRating = async (appointmentId, clientId, { rating, comment }) => {
  const id = parseInt(appointmentId, 10);
  const cid = parseInt(clientId, 10);
  const appt = await prisma.appointment.findUnique({
    where: { id },
  });
  if (!appt) {
    const err = new Error('Cita no encontrada.');
    err.statusCode = 404;
    throw err;
  }
  if (appt.clientId !== cid) {
    const err = new Error('Solo puedes valorar tus propias citas.');
    err.statusCode = 403;
    throw err;
  }
  if (appt.status !== 'completed') {
    const err = new Error('Solo se pueden valorar citas completadas.');
    err.statusCode = 400;
    throw err;
  }
  if (appt.clientRating != null) {
    const err = new Error('Esta cita ya tiene valoración.');
    err.statusCode = 409;
    throw err;
  }
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    const err = new Error('La valoración debe ser un entero entre 1 y 5.');
    err.statusCode = 400;
    throw err;
  }

  let commentVal = null;
  if (comment != null && String(comment).trim()) {
    commentVal = String(comment).trim().slice(0, 2000);
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      clientRating: r,
      clientRatingComment: commentVal,
      clientRatedAt: new Date(),
    },
  });
  return getById(id);
};

/**
 * Resumen agregado de valoraciones (barbero concreto o global si barberId es null).
 * @param {{ barberId: number | null, days: number | null, recentTake?: number }} opts — days null = sin límite temporal
 */
export const getRatingSummary = async ({ barberId = null, days = null, recentTake = 50 } = {}) => {
  const where = {
    status: 'completed',
    clientRating: { not: null },
  };
  if (barberId != null && !Number.isNaN(barberId)) {
    where.barberId = parseInt(barberId, 10);
  }
  if (days != null && days > 0) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);
    where.clientRatedAt = { gte: since };
  }

  const takeRecent = Math.min(Math.max(1, recentTake), 50);

  // groupBy + aggregate evitan cargar todas las filas en memoria y reducen presión en el pool (vs findMany masivo).
  const [grouped, agg, recentRows] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['clientRating'],
      where,
      _count: { _all: true },
    }),
    prisma.appointment.aggregate({
      where,
      _avg: { clientRating: true },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where,
      orderBy: { clientRatedAt: 'desc' },
      take: takeRecent,
      include: {
        client: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
        barber: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const count = agg._count._all ?? 0;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of grouped) {
    const n = row.clientRating;
    if (n >= 1 && n <= 5) distribution[n] = row._count._all;
  }

  const average =
    count > 0 && agg._avg.clientRating != null
      ? Math.round(Number(agg._avg.clientRating) * 100) / 100
      : null;

  const recent = recentRows.map((ap) => ({
    appointmentId: ap.id,
    clientName:
      [ap.client.firstName, ap.client.lastName].filter(Boolean).join(' ').trim() || 'Cliente',
    rating: ap.clientRating,
    comment: ap.clientRatingComment,
    date: ap.clientRatedAt,
    serviceName: ap.service?.name ?? '',
    barberName:
      ap.barber != null
        ? `${ap.barber.firstName || ''} ${ap.barber.lastName || ''}`.trim()
        : undefined,
  }));

  return {
    average,
    count,
    distribution,
    recent,
  };
};

/**
 * Resumen público para la landing (sin autenticación): mismas métricas que rating-summary global,
 * con la lista `recent` acotada por privacidad y rendimiento.
 */
export const getPublicRatingSummary = async ({ recentLimit = 24 } = {}) => {
  const cap = Math.min(Math.max(1, recentLimit), 48);
  const full = await getRatingSummary({
    barberId: null,
    days: null,
    recentTake: cap,
  });
  return {
    average: full.average,
    count: full.count,
    distribution: full.distribution,
    recent: full.recent || [],
  };
};

export const create = async (data) => {
  const { clientId, barberId, serviceId, appointmentDate, startTime, notes } = data;

  const service = await prisma.service.findUnique({
    where: { id: parseInt(serviceId, 10) },
  });
  if (!service) {
    const err = new Error('Servicio no encontrado.');
    err.statusCode = 400;
    throw err;
  }

  const start = typeof startTime === 'string' && startTime ? startTime : '09:00';
  const parts = start.split(':');
  const h = parseInt(parts[0], 10) || 9;
  const m = parseInt(parts[1], 10) || 0;
  const duration = Number(service.durationMinutes);
  const endMinutes = h * 60 + m + duration;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

  const startDate = new Date(`1970-01-01T${start.length === 5 ? start + ':00' : start}`);
  const endDate = new Date(`1970-01-01T${endTime}`);

  const created = await prisma.appointment.create({
    data: {
      clientId: parseInt(clientId, 10),
      barberId: parseInt(barberId, 10),
      serviceId: parseInt(serviceId, 10),
      appointmentDate: new Date(appointmentDate),
      startTime: startDate,
      endTime: endDate,
      notes: notes || null,
    },
  });
  return getById(created.id);
};

export const update = async (id, data) => {
  const { appointmentDate, startTime, status, notes } = data;

  const updateData = {};
  if (appointmentDate) updateData.appointmentDate = new Date(appointmentDate);
  if (startTime !== undefined) {
    const s = typeof startTime === 'string' && startTime ? startTime : '09:00';
    updateData.startTime = new Date(`1970-01-01T${s.length === 5 ? s + ':00' : s}`);
  }
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  if (Object.keys(updateData).length === 0) {
    return getById(id);
  }

  const appointment = await prisma.appointment.update({
    where: { id: parseInt(id, 10) },
    data: updateData,
  });
  return getById(id);
};

export const getAvailableSlots = async (barberId, date) => {
  const bid = parseInt(barberId, 10);
  let dateStr = String(date || '').trim();
  const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) dateStr = `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  const dayOfWeek = d.getUTCDay();

  const schedule = await prisma.barberSchedule.findFirst({
    where: {
      barberId: bid,
      dayOfWeek,
      isAvailable: true,
    },
  });

  let startTime = '09:00';
  let endTime = '18:00';
  if (schedule) {
    startTime = toTimeStr(schedule.startTime);
    endTime = toTimeStr(schedule.endTime);
  }

  const appointmentDateOnly = new Date(Date.UTC(y, m - 1, day));
  const busy = await prisma.appointment.findMany({
    where: {
      barberId: bid,
      appointmentDate: appointmentDateOnly,
      status: { notIn: ['cancelled', 'no_show'] },
    },
    select: { startTime: true, endTime: true },
  });

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const slots = [];
  for (let mins = startMinutes; mins < endMinutes; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const isBusy = busy.some((b) => {
      const busyStart = toTimeStr(b.startTime);
      const busyEnd = toTimeStr(b.endTime);
      return startStr >= busyStart && startStr < busyEnd;
    });
    if (!isBusy) slots.push(startStr);
  }
  return slots;
};
