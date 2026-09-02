/**
 * Appointment Service - Gestión de citas (Prisma)
 */

import prisma from '../lib/prisma.js';
import {
  notifyAppointmentCreated,
  notifyAppointmentCompleted,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
} from './appointmentNotifications.js';
import {
  statusTransitionNotification,
  validateCancelReason,
} from './appointmentNotificationRules.js';
import {
  addDaysToYmd,
  getColombiaTodayYmd,
  getColombiaNowParts,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';
import {
  isManualAdminStatus,
  resolveAutomaticStatus,
  APPOINTMENT_TERMINAL_STATUSES,
} from './appointmentStatusAutomation.js';
import { assertAppointmentIsEditable } from './appointmentEditRules.js';
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

/** Prefijos en notes para citas multi-servicio (sin tabla de unión). */
const SERVICES_IDS_PREFIX_RE = /\[ServiciosIds:\s*([^\]]+)\]\s*/i;
const SERVICES_NAMES_PREFIX_RE = /\[Servicios:\s*([^\]]+)\]\s*/i;
const TOTAL_PRICE_PREFIX_RE = /\[Total:\s*([^\]]+)\]\s*/i;

function parseServiceIdsFromNotes(notes) {
  const match = String(notes || '').match(SERVICES_IDS_PREFIX_RE);
  if (!match) return [];
  return [
    ...new Set(
      match[1]
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}

function parseServiceNamesFromNotes(notes) {
  const match = String(notes || '').match(SERVICES_NAMES_PREFIX_RE);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extrae etiqueta de servicios múltiples guardada en notas al crear la cita. */
function displayServiceName(notes, fallbackName) {
  const names = parseServiceNamesFromNotes(notes);
  if (names.length) return names.join(', ');
  return fallbackName;
}

/** Quita prefijos de servicios múltiples; deja solo el texto del usuario. */
function userNotesOnly(notes) {
  return String(notes || '')
    .replace(SERVICES_IDS_PREFIX_RE, '')
    .replace(SERVICES_NAMES_PREFIX_RE, '')
    .replace(TOTAL_PRICE_PREFIX_RE, '')
    .trim() || null;
}

/** Total explícito en notas `[Total:50000]` si existe. */
function parseTotalPriceFromNotes(notes) {
  const match = String(notes || '').match(TOTAL_PRICE_PREFIX_RE);
  if (!match) return null;
  const n = Number(String(match[1]).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function buildMultiServiceNotes(orderedServices, userNotes) {
  const u = typeof userNotes === 'string' ? userNotes.trim() : '';
  if (!orderedServices?.length || orderedServices.length === 1) {
    return u || null;
  }
  const ids = orderedServices.map((s) => s.id).join(',');
  const names = orderedServices.map((s) => s.name).join(', ');
  const prefix = `[ServiciosIds:${ids}][Servicios: ${names}]`;
  return u ? `${prefix} ${u}` : prefix;
}

function endTimeFromStartAndDuration(startTimeValue, durationMinutes) {
  const parsedStart = parseClockTime(toTimeStr(startTimeValue) || startTimeValue, { required: true });
  const endMinutes = parsedStart.totalMinutes + Number(durationMinutes);
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
  return {
    startDate: clockTimeToDate(parsedStart),
    endDate: new Date(`1970-01-01T${endTimeStr}Z`),
    startMinutes: parsedStart.totalMinutes,
    endMinutes,
  };
}

function normalizeServiceLabel(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Resuelve la lista ordenada de servicios de una cita (IDs en notes, nombres legacy o serviceId).
 * @param {object} a appointment con notes, serviceId, service
 * @param {{ service: { findMany: Function } }} [db] cliente Prisma o tx
 */
export async function resolveOrderedServicesForAppointment(a, db = prisma) {
  let ids = parseServiceIdsFromNotes(a.notes);
  if (!ids.length) {
    const names = parseServiceNamesFromNotes(a.notes);
    if (names.length > 1) {
      const found = await db.service.findMany({
        where: {
          OR: names.map((n) => ({
            name: { equals: n, mode: 'insensitive' },
          })),
        },
      });
      const byName = new Map(found.map((s) => [normalizeServiceLabel(s.name), s]));
      const ordered = names.map((n) => byName.get(normalizeServiceLabel(n))).filter(Boolean);
      // Preferir coincidencia parcial (≥2) sobre quedarse solo con el serviceId primario
      if (ordered.length === names.length || ordered.length >= 2) return ordered;
    }
    ids = a.serviceId ? [a.serviceId] : [];
  }
  if (!ids.length) return a.service ? [a.service] : [];

  const records = await db.service.findMany({ where: { id: { in: ids } } });
  const byId = new Map(records.map((s) => [s.id, s]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!ordered.length && a.service) return [a.service];
  return ordered;
}

export function mapAppointmentServicesFields(orderedServices, fallbackService, notes) {
  const list = orderedServices?.length ? orderedServices : fallbackService ? [fallbackService] : [];
  const primary = list[0] || fallbackService || null;
  const servicesSum = list.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const notesTotal = parseTotalPriceFromNotes(notes);
  const totalPrice = notesTotal != null ? notesTotal : servicesSum;
  return {
    service_id: primary?.id ?? null,
    service_ids: list.map((s) => s.id),
    service_name: list.map((s) => s.name).filter(Boolean).join(', ') || primary?.name || null,
    /**
     * Prioriza main/pagos: `price` permanece como total cobrable (payment.service usa svc.price).
     * `total_price` expone la misma suma para UI. No se redujo `price` al principal para no romper cobros.
     */
    price: totalPrice,
    total_price: totalPrice,
    duration_minutes: list.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0),
  };
}

export const getAll = async ({ date, dateFrom, dateTo, barberId, clientId, status, limit = 100, offset = 0 }) => {
  const where = {};

  // Antes exigía las dos puntas del rango, así que un `dateFrom` suelto se
  // ignoraba en silencio y devolvía también citas pasadas. Cada extremo se aplica
  // por separado, que es lo que el validador de la ruta ya permitía enviar.
  if (dateFrom || dateTo) {
    where.appointmentDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
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

  const enriched = await Promise.all(
    appointments.map(async (a) => {
      const ordered = await resolveOrderedServicesForAppointment(a);
      const svc = mapAppointmentServicesFields(ordered, a.service, a.notes);
      return {
        id: a.id,
        client_id: a.clientId,
        barber_id: a.barberId,
        service_id: svc.service_id,
        service_ids: svc.service_ids,
        appointment_date: a.appointmentDate,
        start_time: toTimeStr(a.startTime),
        end_time: toTimeStr(a.endTime),
        status: a.status,
        notes: userNotesOnly(a.notes),
        cancel_reason: a.cancelReason ?? null,
        created_at: a.createdAt,
        client_first_name: a.client.firstName,
        client_last_name: a.client.lastName,
        barber_first_name: a.barber.firstName,
        barber_last_name: a.barber.lastName,
        service_name: svc.service_name || displayServiceName(a.notes, a.service.name),
        price: svc.price,
        total_price: svc.total_price,
        duration_minutes: svc.duration_minutes,
        has_active_payment: (a.paymentLines?.length || 0) > 0,
        clientRating: a.clientRating,
        clientRatingComment: a.clientRatingComment,
        clientRatedAt: a.clientRatedAt,
      };
    }),
  );

  return {
    appointments: enriched,
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
  const ordered = await resolveOrderedServicesForAppointment(a);
  const svc = mapAppointmentServicesFields(ordered, a.service, a.notes);
  return {
    id: a.id,
    client_id: a.clientId,
    barber_id: a.barberId,
    service_id: svc.service_id,
    service_ids: svc.service_ids,
    appointment_date: a.appointmentDate,
    start_time: toTimeStr(a.startTime),
    end_time: toTimeStr(a.endTime),
    status: a.status,
    notes: userNotesOnly(a.notes),
    cancel_reason: a.cancelReason ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    client_first_name: a.client.firstName,
    client_last_name: a.client.lastName,
    client_phone: a.client.phone,
    client_email: a.client.email,
    barber_first_name: a.barber.firstName,
    barber_last_name: a.barber.lastName,
    service_name: svc.service_name || displayServiceName(a.notes, a.service.name),
    price: svc.price,
    total_price: svc.total_price,
    duration_minutes: svc.duration_minutes,
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

/**
 * Citas del cliente que pueden estar ocupando cupo: no terminales y de hoy en
 * adelante. El filtro por fecha se hace en SQL (aprovecha el índice) y el corte
 * fino por hora lo aplica `appointmentLimitRules` sobre un puñado de filas.
 *
 * @param {number} clientId
 * @returns {Promise<Array<{ appointmentDate: Date, startTime: Date, status: string }>>}
 */
export const getPendingAppointmentsForClient = async (clientId) =>
  prisma.appointment.findMany({
    where: {
      clientId,
      status: { notIn: [...APPOINTMENT_TERMINAL_STATUSES] },
      appointmentDate: { gte: ymdToUtcDate(getColombiaTodayYmd()) },
    },
    select: { appointmentDate: true, startTime: true, status: true },
  });

/**
 * @param {object} data
 * @param {{ enforceClientLimit?: boolean }} [options] `enforceClientLimit` viene
 *   activado por defecto para que cualquier llamador nuevo quede protegido salvo
 *   que renuncie explícitamente. Solo el admin lo desactiva: agenda por teléfono
 *   y para walk-ins, con contexto que el sistema no tiene.
 */
export const create = async (data, { enforceClientLimit = true } = {}) => {
  const { clientId, barberId, serviceId, serviceIds, appointmentDate, startTime, notes } = data;

  const parsedClientId = parseInt(clientId, 10);
  if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
    const err = new Error('Indica un cliente válido.');
    err.statusCode = 400;
    throw err;
  }

  // Una sola consulta resuelve las dos guardas de cliente: que exista y que no
  // esté inactivado. El estado se comprueba SIEMPRE, también para el admin: son
  // banderas distintas y si el admin quiere agendarle, primero lo reactiva.
  const client = await prisma.client.findUnique({
    where: { id: parsedClientId },
    select: { id: true, isActive: true },
  });
  if (!client) {
    const err = new Error('Cliente no encontrado.');
    err.statusCode = 400;
    throw err;
  }
  if (!client.isActive) {
    const err = new Error(
      'Esta cuenta no puede agendar citas por el momento. Contacta con la barbería.'
    );
    err.statusCode = 403;
    err.reason = 'CLIENT_INACTIVE';
    throw err;
  }

  // Se comprueba antes que nada para que el cliente que agotó su cupo lea el
  // motivo real y no un error de servicio o de horario que no viene al caso.
  if (enforceClientLimit) {
    assertUnderPendingLimit(await getPendingAppointmentsForClient(parsedClientId));
  }

  const ids = Array.isArray(serviceIds) && serviceIds.length
    ? [...new Set(serviceIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0))]
    : [parseInt(serviceId, 10)];

  if (!ids.length || !Number.isFinite(ids[0])) {
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

  const userNotes = typeof notes === 'string' ? notes.trim() : '';
  const storedNotes = buildMultiServiceNotes(orderedServices, userNotes);

  const { startDate, endDate, startMinutes, endMinutes } = endTimeFromStartAndDuration(
    startTime,
    duration,
  );

  await assertNoOverlap({
    barberId,
    appointmentDate,
    startMin: startMinutes,
    endMin: endMinutes,
  });

  const created = await prisma.appointment.create({
    data: {
      clientId: parsedClientId,
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

  const hasServiceIds = Array.isArray(data.serviceIds) && data.serviceIds.length > 0;
  const hasServiceId = data.serviceId != null;

  let orderedServices;
  if (hasServiceIds || hasServiceId) {
    const ids = hasServiceIds
      ? [...new Set(data.serviceIds.map((sid) => parseInt(sid, 10)).filter((n) => Number.isFinite(n) && n > 0))]
      : [parseInt(data.serviceId, 10)];
    if (!ids.length || !Number.isFinite(ids[0])) {
      const err = new Error('Indica al menos un servicio válido.');
      err.statusCode = 400;
      throw err;
    }
    const serviceRecords = await prisma.service.findMany({ where: { id: { in: ids } } });
    if (serviceRecords.length !== ids.length) {
      const err = new Error('Uno o más servicios no existen.');
      err.statusCode = 400;
      throw err;
    }
    const byId = new Map(serviceRecords.map((s) => [s.id, s]));
    orderedServices = ids.map((sid) => byId.get(sid));
  } else {
    orderedServices = await resolveOrderedServicesForAppointment(existing);
  }

  if (!orderedServices.length) {
    const err = new Error('Servicio no encontrado.');
    err.statusCode = 400;
    throw err;
  }

  const primaryService = orderedServices[0];
  const duration = orderedServices.reduce((sum, s) => sum + Number(s.durationMinutes), 0);

  const nextAppointmentDate =
    data.appointmentDate != null ? new Date(data.appointmentDate) : existing.appointmentDate;

  let nextStartTime = existing.startTime;
  if (data.startTime !== undefined) {
    const parsed = parseClockTime(data.startTime, { required: true });
    nextStartTime = clockTimeToDate(parsed);
  }

  const servicesChanged = hasServiceIds || hasServiceId;
  const timingChanged =
    servicesChanged ||
    data.startTime !== undefined ||
    data.appointmentDate != null;

  let nextEndTime = existing.endTime;
  if (timingChanged) {
    const timing = endTimeFromStartAndDuration(nextStartTime, duration);
    nextEndTime = timing.endDate;
  }

  const updateData = {};
  if (data.clientId != null) updateData.clientId = nextClientId;
  if (data.barberId != null) updateData.barberId = nextBarberId;
  if (servicesChanged) updateData.serviceId = primaryService.id;
  if (data.appointmentDate != null) updateData.appointmentDate = nextAppointmentDate;
  if (data.startTime !== undefined) updateData.startTime = nextStartTime;
  if (timingChanged) updateData.endTime = nextEndTime;
  if (data.status) updateData.status = data.status;

  if (data.status === 'cancelled') {
    const reasonCheck = validateCancelReason(data.cancelReason);
    if (!reasonCheck.ok) {
      const err = new Error(reasonCheck.message);
      err.statusCode = 400;
      throw err;
    }
    updateData.cancelReason = reasonCheck.reason;
  }

  // Preservar prefijos multi-servicio al guardar notas del usuario
  if (data.notes !== undefined || servicesChanged) {
    const userPart =
      data.notes !== undefined
        ? (data.notes === '' ? '' : String(data.notes).trim())
        : (userNotesOnly(existing.notes) || '');
    updateData.notes = buildMultiServiceNotes(orderedServices, userPart);
  }

  /*
   * Estado *efectivo*, no `existing.status`: la promoción a `in_progress`/`completed`
   * la persiste el job de sincronización, así que en BD la cita puede seguir como
   * `confirmed` cuando el servicio ya empezó. Usar el valor crudo dejaba pasar
   * reprogramaciones de citas en curso.
   */
  const effectiveStatus = resolveAutomaticStatus(existing);

  // Reprogramar una cita que ya empezó no tiene sentido operativo: el servicio se
  // está prestando. Aplica a admin y a cliente por igual.
  assertAppointmentIsEditable(existing, data);

  if (data.status != null) {
    if (!isManualAdminStatus(data.status)) {
      const err = new Error(
        'El estado se actualiza automáticamente. Solo puedes confirmar o cancelar la cita.'
      );
      err.statusCode = 400;
      throw err;
    }
    const autoLocked = ['in_progress', 'completed', 'cancelled', 'no_show'];
    if (autoLocked.includes(effectiveStatus)) {
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
  const prev = existing.status;
  const next = data.status;
  const transition = statusTransitionNotification(prev, next);
  // TEMP diagnóstico cancelación/mails — quitar tras validar en prod
  console.info('[appointment.update.notify]', {
    id: apptId,
    prev,
    next,
    transition,
    prevEqualsNext: prev === next,
    client_email: full?.client_email ?? null,
    hasCancelReason: Boolean(full?.cancel_reason),
  });
  if (transition === 'confirmed' && full) {
    notifyAppointmentConfirmed(full);
  } else if (transition === 'cancelled' && full) {
    notifyAppointmentCancelled(full);
  } else if (transition === 'completed' && full) {
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
  const todayYmd = getColombiaTodayYmd();
  const now = getColombiaNowParts();
  const nowMinutes = now.hour * 60 + now.minute;

  for (let mins = startMinutes; mins + duration <= endMinutes; mins += SLOT_GRID_MINUTES) {
    // No ofrecer horarios ya pasados cuando la fecha es hoy
    if (dateStr === todayYmd && mins <= nowMinutes) continue;

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
