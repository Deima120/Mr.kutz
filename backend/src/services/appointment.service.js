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
    ...a,
    client_first_name: a.client.firstName,
    client_last_name: a.client.lastName,
    client_phone: a.client.phone,
    client_email: a.client.email,
    barber_first_name: a.barber.firstName,
    barber_last_name: a.barber.lastName,
    service_name: a.service.name,
    price: a.service.price,
    duration_minutes: a.service.durationMinutes,
  };
};

export const create = async (data) => {
  const { clientId, barberId, serviceId, appointmentDate, startTime, notes } = data;

  const service = await prisma.service.findUnique({
    where: { id: parseInt(serviceId, 10) },
  });
  if (!service) {
    const err = new Error('Service not found');
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

  const appointment = await prisma.appointment.create({
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
  return appointment;
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
