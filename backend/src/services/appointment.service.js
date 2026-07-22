/**
 * Appointment Service - Gestión de citas (Prisma)
 */

import prisma from '../lib/prisma.js';
import {
  notifyAppointmentCreated,
  notifyAppointmentCompleted,
} from './appointmentNotifications.js';
import {
  addDaysToYmd,
  getColombiaTodayYmd,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';
import {
  isManualAdminStatus,
  resolveAutomaticStatus,
} from './appointmentStatusAutomation.js';
import { clockTimeToDate, parseClockTime } from './appointment.time.helpers.js';

/** Días hacia atrás que revisa el job de estados (citas confirmadas sin actualizar). */
export const STATUS_SYNC_LOOKBACK_DAYS = 30;

/** Granularidad de huecos al calcular horarios (permite servicios de 5, 10 min, etc.). */
const SLOT_GRID_MINUTES = 5;
const MIN_SLOT_DURATION_MINUTES = 5;

/**
 * Verifica que el rango [startMin, endMin) no se solape con otra cita activa
 * del mismo barbero ese día. Lanza 409 si hay conflicto.
 */
async function assertNoOverlap({ barberId, appointmentDate, startMin, endMin, excludeId }) {
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
    return;
  }
  const dayKey = new Date(appointmentDate);
  dayKey.setUTCHours(0, 0, 0, 0);
  const busy = await prisma.appointment.findMany({
    where: {
      barberId: Number(barberId),
      appointmentDate: dayKey,
      status: { notIn: ['cancelled', 'no_show'] },
      ...(excludeId != null ? { id: { not: Number(excludeId) } } : {}),
    },
    select: { startTime: true, endTime: true },
  });
  for (const b of busy) {
    const s = toTimeStr(b.startTime);
    const e = toTimeStr(b.endTime);
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const busyStart = sh * 60 + sm;
    const busyEnd = eh * 60 + em;
    if (startMin < busyEnd && endMin > busyStart) {
      const err = new Error('El barbero ya tiene otra cita en ese horario.');
      err.statusCode = 409;
      err.reason = 'APPOINTMENT_OVERLAP';
      throw err;
    }
  }
}

/** Convierte Date o string de tiempo a "HH:MM" */
function toTimeStr(d) {
  if (!d) {
    throw new Error('Valor de tiempo inválido.');
  }
  if (typeof d === 'string') {
    const match = d.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
    throw new Error(`Formato de hora inválido: "${d}"`);
  }
  if (d instanceof Date) {
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(d);
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  throw new Error(`Valor de tiempo no reconocido: "${s}"`);
}

async function persistAutomaticStatusChange(rec, next) {
  const result = await prisma.appointment.updateMany({
    where: { id: rec.id, status: rec.status },
    data: { status: next },
  });
  if (result.count === 0) return false;
  rec.status = next;
  return true;
}

async function applyAutomaticStatusUpdates(records) {
  if (!records?.length) return { updated: 0 };
  const now = new Date();
  let updated = 0;
  for (const rec of records) {
    const next = resolveAutomaticStatus(rec, now);
    if (next === rec.status) continue;
    const changed = await persistAutomaticStatusChange(rec, next);
    if (!changed) continue;
    updated += 1;
    if (next === 'completed') {
      const full = await getById(rec.id);
      if (full) notifyAppointmentCompleted(full);
    }
  }
  return { updated };
}

/**
 * Sincroniza estados automáticos de citas en BD sin depender de que alguien abra el panel.
 * Revisa confirmadas / en progreso de los últimos STATUS_SYNC_LOOKBACK_DAYS hasta hoy (Colombia).
 */
export async function syncAutomaticAppointmentStatuses() {
  const todayYmd = getColombiaTodayYmd();
  const lookbackYmd = addDaysToYmd(todayYmd, -STATUS_SYNC_LOOKBACK_DAYS);
  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: ['confirmed', 'in_progress'] },
      appointmentDate: {
        gte: ymdToUtcDate(lookbackYmd),
        lte: ymdToUtcDate(todayYmd),
      },
    },
    select: {
      id: true,
      status: true,
      appointmentDate: true,
      startTime: true,
      endTime: true,
    },
  });
  const { updated } = await applyAutomaticStatusUpdates(candidates);
  return { checked: candidates.length, updated };
}

/** Extrae etiqueta de servicios múltiples guardada en notas al crear la cita. */
function displayServiceName(notes, fallbackName) {
  const match = String(notes || '').match(/^\[Servicios:\s*([^\]]+)\]/);
  if (match) return match[1].trim();
  return fallbackName;
}

/** Quita el prefijo de servicios múltiples de las notas para mostrar solo el texto del usuario. */
function userNotesOnly(notes) {
  return String(notes || '').replace(/^\[Servicios:[^\]]+\]\s*/, '').trim() || null;
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
  if (status) {
    const statuses = String(status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true } },
        barber: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, price: true, durationMinutes: true } },
        paymentLines: {
          where: { voidedAt: null, lineType: 'service' },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: dateFrom && dateTo
        ? [{ appointmentDate: 'asc' }, { startTime: 'asc' }]
        : [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.appointment.count({ where }),
  ]);

  await applyAutomaticStatusUpdates(appointments);

  return {
    appointments: appointments.map((a) => ({
      id: a.id,
      client_id: a.clientId,
      barber_id: a.barberId,
      service_id: a.serviceId,
      appointment_date: a.appointmentDate,
      start_time: toTimeStr(a.startTime),
      end_time: toTimeStr(a.endTime),
      status: a.status,
      notes: userNotesOnly(a.notes),
      created_at: a.createdAt,
      client_first_name: a.client.firstName,
      client_last_name: a.client.lastName,
      barber_first_name: a.barber.firstName,
      barber_last_name: a.barber.lastName,
      service_name: displayServiceName(a.notes, a.service.name),
      price: a.service.price,
      duration_minutes: a.service.durationMinutes,
      has_active_payment: (a.paymentLines?.length || 0) > 0,
      clientRating: a.clientRating,
      clientRatingComment: a.clientRatingComment,
      clientRatedAt: a.clientRatedAt,
    })),
    total,
    limit,
    offset,
  };
};

export const getById = async (id) => {
  const a = await prisma.appointment.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      client: { select: { firstName: true, lastName: true, phone: true, email: true } },
      barber: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, price: true, durationMinutes: true } },
      paymentLines: {
        where: { voidedAt: null, lineType: 'service' },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!a) return null;
  await applyAutomaticStatusUpdates([a]);
  return {
    id: a.id,
    client_id: a.clientId,
    barber_id: a.barberId,
    service_id: a.serviceId,
    appointment_date: a.appointmentDate,
    start_time: toTimeStr(a.startTime),
    end_time: toTimeStr(a.endTime),
    status: a.status,
    notes: userNotesOnly(a.notes),
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    client_first_name: a.client.firstName,
    client_last_name: a.client.lastName,
    client_phone: a.client.phone,
    client_email: a.client.email,
    barber_first_name: a.barber.firstName,
    barber_last_name: a.barber.lastName,
    service_name: displayServiceName(a.notes, a.service.name),
    price: a.service.price,
    duration_minutes: a.service.durationMinutes,
    has_active_payment: (a.paymentLines?.length || 0) > 0,
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
 * @param {{ barberId: number | null, days: number | null, recentTake?: number, minRating?: number }} opts — days null = sin límite temporal
 */
export const getRatingSummary = async ({ barberId = null, days = null, recentTake = 50, minRating = null } = {}) => {
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
  if (minRating != null && minRating > 0) {
    where.clientRating = { gte: minRating };
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
 * con la lista `recent` acotada por privacidad y rendimiento. Solo muestra reseñas de 4+ estrellas.
 */
export const getPublicRatingSummary = async ({ recentLimit = 24 } = {}) => {
  const cap = Math.min(Math.max(1, recentLimit), 48);
  const full = await getRatingSummary({
    barberId: null,
    days: null,
    recentTake: cap,
    minRating: 4,
  });
  return {
    average: full.average,
    count: full.count,
    distribution: full.distribution,
    recent: full.recent || [],
  };
};

export const create = async (data) => {
  const { clientId, barberId, serviceId, serviceIds, appointmentDate, startTime, notes } = data;

  const ids = Array.isArray(serviceIds) && serviceIds.length
    ? [...new Set(serviceIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0))]
    : [parseInt(serviceId, 10)];

  if (!ids.length || !Number.isFinite(ids[0])) {
    const err = new Error('Indica al menos un servicio válido.');
    err.statusCode = 400;
    throw err;
  }

  const serviceRecords = await prisma.service.findMany({
    where: { id: { in: ids } },
  });
  if (serviceRecords.length !== ids.length) {
    const err = new Error('Uno o más servicios no existen.');
    err.statusCode = 400;
    throw err;
  }

  const serviceById = new Map(serviceRecords.map((s) => [s.id, s]));
  const orderedServices = ids.map((id) => serviceById.get(id));
  const primaryService = orderedServices[0];
  const duration = orderedServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0);
  const servicesLabel = orderedServices.map((s) => s.name).join(', ');

  const parsedStart = parseClockTime(startTime, { required: true });
  const startMinutes = parsedStart.totalMinutes;
  const endMinutes = startMinutes + duration;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

  const startDate = clockTimeToDate(parsedStart);
  const endDate = new Date(`1970-01-01T${endTime}Z`);

  await assertNoOverlap({
    barberId,
    appointmentDate,
    startMin: startMinutes,
    endMin: endMinutes,
  });

  const userNotes = typeof notes === 'string' ? notes.trim() : '';
  const storedNotes = ids.length > 1
    ? `[Servicios: ${servicesLabel}]${userNotes ? ` ${userNotes}` : ''}`
    : (userNotes || null);

  const created = await prisma.appointment.create({
    data: {
      clientId: parseInt(clientId, 10),
      barberId: parseInt(barberId, 10),
      serviceId: primaryService.id,
      appointmentDate: new Date(appointmentDate),
      startTime: startDate,
      endTime: endDate,
      notes: storedNotes,
    },
  });
  const full = await getById(created.id);
  notifyAppointmentCreated(full);
  return full;
};

export const update = async (id, data, existingAppointment = null) => {
  const apptId = parseInt(id, 10);
  const existing = existingAppointment || await prisma.appointment.findUnique({
    where: { id: apptId },
    include: { service: true },
  });
  if (!existing) return null;

  const nextClientId = data.clientId != null ? parseInt(data.clientId, 10) : existing.clientId;
  const nextBarberId = data.barberId != null ? parseInt(data.barberId, 10) : existing.barberId;
  const nextServiceId = data.serviceId != null ? parseInt(data.serviceId, 10) : existing.serviceId;

  const service = await prisma.service.findUnique({
    where: { id: nextServiceId },
  });
  if (!service) {
    const err = new Error('Servicio no encontrado.');
    err.statusCode = 400;
    throw err;
  }

  const nextAppointmentDate =
    data.appointmentDate != null ? new Date(data.appointmentDate) : existing.appointmentDate;

  let nextStartTime = existing.startTime;
  if (data.startTime !== undefined) {
    const parsed = parseClockTime(data.startTime, { required: true });
    nextStartTime = clockTimeToDate(parsed);
  }

  const timingChanged =
    data.serviceId != null ||
    data.startTime !== undefined ||
    data.appointmentDate != null;

  let nextEndTime = existing.endTime;
  if (timingChanged) {
    const parsedStart = parseClockTime(toTimeStr(nextStartTime), { required: true });
    const duration = Number(service.durationMinutes);
    const endMinutes = parsedStart.totalMinutes + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
    nextEndTime = new Date(`1970-01-01T${endTimeStr}Z`);
  }

  const updateData = {};
  if (data.clientId != null) updateData.clientId = nextClientId;
  if (data.barberId != null) updateData.barberId = nextBarberId;
  if (data.serviceId != null) updateData.serviceId = nextServiceId;
  if (data.appointmentDate != null) updateData.appointmentDate = nextAppointmentDate;
  if (data.startTime !== undefined) updateData.startTime = nextStartTime;
  if (timingChanged) updateData.endTime = nextEndTime;
  if (data.status) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : data.notes;

  if (data.status != null) {
    if (!isManualAdminStatus(data.status)) {
      const err = new Error(
        'El estado se actualiza automáticamente. Solo puedes confirmar o cancelar la cita.'
      );
      err.statusCode = 400;
      throw err;
    }
    const autoLocked = ['in_progress', 'completed', 'cancelled', 'no_show'];
    if (autoLocked.includes(existing.status)) {
      const err = new Error('Esta cita ya no admite cambios manuales de estado.');
      err.statusCode = 400;
      throw err;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return getById(apptId);
  }

  if (timingChanged || data.barberId != null) {
    const startStr = toTimeStr(nextStartTime);
    const [sh, sm] = startStr.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endStr = toTimeStr(nextEndTime);
    const [eh, em] = endStr.split(':').map(Number);
    const endMin = eh * 60 + em;
    await assertNoOverlap({
      barberId: nextBarberId,
      appointmentDate: nextAppointmentDate,
      startMin,
      endMin,
      excludeId: apptId,
    });
  }

  await prisma.appointment.update({
    where: { id: apptId },
    data: updateData,
  });

  const full = await getById(apptId);
  if (
    data.status === 'completed' &&
    existing.status !== 'completed' &&
    full
  ) {
    notifyAppointmentCompleted(full);
  }
  return full;
};

export const getAvailableSlots = async (barberId, date, excludeAppointmentId = null, durationMinutes = 30) => {
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
  const excludeId =
    excludeAppointmentId != null && excludeAppointmentId !== ''
      ? parseInt(String(excludeAppointmentId), 10)
      : null;
  const busyWhere = {
    barberId: bid,
    appointmentDate: appointmentDateOnly,
    status: { notIn: ['cancelled', 'no_show'] },
    ...(Number.isFinite(excludeId) ? { id: { not: excludeId } } : {}),
  };
  const busy = await prisma.appointment.findMany({
    where: busyWhere,
    select: { startTime: true, endTime: true },
  });

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const duration = Math.max(
    MIN_SLOT_DURATION_MINUTES,
    parseInt(durationMinutes, 10) || 30
  );

  const slots = [];
  for (let mins = startMinutes; mins + duration <= endMinutes; mins += SLOT_GRID_MINUTES) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const slotEnd = mins + duration;
    const isBusy = busy.some((b) => {
      const busyStartStr = toTimeStr(b.startTime);
      const busyEndStr = toTimeStr(b.endTime);
      const [bsh, bsm] = busyStartStr.split(':').map(Number);
      const [beh, bem] = busyEndStr.split(':').map(Number);
      const busyStart = bsh * 60 + bsm;
      const busyEnd = beh * 60 + bem;
      return mins < busyEnd && slotEnd > busyStart;
    });
    if (!isBusy) slots.push(startStr);
  }
  return slots;
};
