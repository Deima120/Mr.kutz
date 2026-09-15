/**
 * Ausencias puntuales de barbero (vacaciones, incapacidad, permiso, festivo).
 *
 * Independiente de `BarberSchedule` (la plantilla semanal recurrente): una
 * ausencia bloquea solo las fechas que cubre, sin tocar el horario de siempre.
 * El punto de enganche con la agenda es `resolveBarberDayWindow`
 * (`appointment.service.js`), que consulta esta tabla ANTES de mirar la
 * plantilla semanal — una ausencia manda siempre.
 */

import { randomUUID } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { ymdToUtcDate, extractAppointmentDateYmd } from '../utils/colombiaTime.js';
import {
  BARBER_ABSENCE_TYPES,
  assertValidExceptionRange,
  findOverlappingException,
} from './barberScheduleRules.js';

function httpError(message, statusCode = 400, reason = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  return err;
}

function assertValidType(type) {
  if (!BARBER_ABSENCE_TYPES.includes(type)) {
    throw httpError(`Tipo de ausencia no válido. Debe ser uno de: ${BARBER_ABSENCE_TYPES.join(', ')}.`);
  }
}

function fullName(person) {
  return `${person?.firstName || ''} ${person?.lastName || ''}`.trim();
}

function toDto(row) {
  return {
    id: row.id,
    barberId: row.barberId,
    barberName: row.barber ? fullName(row.barber) : undefined,
    dateFrom: extractAppointmentDateYmd(row.dateFrom),
    dateTo: extractAppointmentDateYmd(row.dateTo),
    type: row.type,
    reason: row.reason,
    batchId: row.batchId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
  };
}

/**
 * @param {{ barberId?: number|string, from?: string, to?: string, includeCancelled?: boolean }} params
 */
export async function list({ barberId, from, to, includeCancelled = false } = {}) {
  const where = {};
  if (barberId != null && barberId !== '') where.barberId = parseInt(barberId, 10);
  if (!includeCancelled) where.cancelledAt = null;
  const overlap = [];
  if (to) overlap.push({ dateFrom: { lte: ymdToUtcDate(to) } });
  if (from) overlap.push({ dateTo: { gte: ymdToUtcDate(from) } });
  if (overlap.length) where.AND = overlap;

  const rows = await prisma.barberScheduleException.findMany({
    where,
    include: { barber: { select: { firstName: true, lastName: true } } },
    orderBy: [{ dateFrom: 'asc' }, { barberId: 'asc' }],
  });
  return rows.map(toDto);
}

/** Citas activas (scheduled/confirmed) de esos barberos dentro del rango — para el aviso previo. */
async function findAffectedAppointments(barberIds, dateFrom, dateTo) {
  const rows = await prisma.appointment.findMany({
    where: {
      barberId: { in: barberIds },
      status: { in: ['scheduled', 'confirmed'] },
      appointmentDate: { gte: ymdToUtcDate(dateFrom), lte: ymdToUtcDate(dateTo) },
    },
    select: {
      id: true,
      appointmentDate: true,
      startTime: true,
      client: { select: { firstName: true, lastName: true } },
      barber: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ appointmentDate: 'asc' }],
  });
  return rows.map((a) => ({
    id: a.id,
    appointmentDate: extractAppointmentDateYmd(a.appointmentDate),
    clientName: fullName(a.client),
    barberName: fullName(a.barber),
  }));
}

/**
 * Registra una ausencia. Si hay citas agendadas dentro del rango y no viene
 * `confirmed: true`, NO crea nada — devuelve `needsConfirmation` con la lista
 * de citas afectadas para que el admin decida (avisar y dejar decidir, no
 * bloquear ni cancelar solo).
 *
 * `applyToAllBarbers` solo es válido para `type: 'holiday'` — un festivo real
 * cierra el negocio entero; el resto de tipos son siempre de un barbero.
 * Crea una fila por barbero activo, todas con el mismo `batchId`, para poder
 * cancelarlas juntas después.
 */
export async function create(data = {}, { createdBy } = {}) {
  const { dateFrom, dateTo, type, reason, applyToAllBarbers, barberId, confirmed } = data;
  assertValidType(type);
  assertValidExceptionRange(dateFrom, dateTo);
  const trimmedReason = reason ? String(reason).trim().slice(0, 300) || null : null;

  let barberIds;
  if (applyToAllBarbers) {
    if (type !== 'holiday') {
      throw httpError('Solo un festivo se puede aplicar a todos los barberos a la vez.');
    }
    const activeBarbers = await prisma.barber.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    if (activeBarbers.length === 0) throw httpError('No hay barberos activos.');
    barberIds = activeBarbers.map((b) => b.id);
  } else {
    const bid = parseInt(barberId, 10);
    if (!Number.isFinite(bid) || bid < 1) throw httpError('Indica un barbero válido.');
    const barber = await prisma.barber.findUnique({ where: { id: bid }, select: { id: true } });
    if (!barber) throw httpError('Barbero no encontrado.', 404);
    barberIds = [bid];
  }

  // Ninguna ausencia vigente del mismo barbero puede solaparse en fechas.
  const existing = await prisma.barberScheduleException.findMany({
    where: { barberId: { in: barberIds }, cancelledAt: null },
  });
  for (const bid of barberIds) {
    const propias = existing
      .filter((e) => e.barberId === bid)
      .map((e) => ({ ...e, dateFrom: extractAppointmentDateYmd(e.dateFrom), dateTo: extractAppointmentDateYmd(e.dateTo) }));
    const choque = findOverlappingException(propias, { dateFrom, dateTo });
    if (choque) {
      throw httpError(
        `Ya hay una ausencia registrada para ese barbero entre ${choque.dateFrom} y ${choque.dateTo}.`,
        409,
        'EXCEPTION_OVERLAP'
      );
    }
  }

  const affectedAppointments = await findAffectedAppointments(barberIds, dateFrom, dateTo);
  if (affectedAppointments.length > 0 && !confirmed) {
    return { created: false, needsConfirmation: true, affectedAppointments };
  }

  const batchId = barberIds.length > 1 ? randomUUID() : null;
  const rows = await prisma.$transaction(
    barberIds.map((bid) =>
      prisma.barberScheduleException.create({
        data: {
          barberId: bid,
          dateFrom: ymdToUtcDate(dateFrom),
          dateTo: ymdToUtcDate(dateTo),
          type,
          reason: trimmedReason,
          batchId,
          createdBy: createdBy ?? null,
        },
      })
    )
  );

  return { created: true, needsConfirmation: false, exceptions: rows.map(toDto), affectedAppointments };
}

/** Cancela una ausencia individual (no la borra — mismo criterio que el resto del proyecto). */
export async function cancel(id, { cancelledBy } = {}) {
  const row = await prisma.barberScheduleException.findUnique({ where: { id: parseInt(id, 10) } });
  if (!row) throw httpError('Ausencia no encontrada.', 404);
  if (row.cancelledAt) throw httpError('Esta ausencia ya estaba cancelada.', 409);
  const updated = await prisma.barberScheduleException.update({
    where: { id: row.id },
    data: { cancelledAt: new Date(), cancelledBy: cancelledBy ?? null },
  });
  return toDto(updated);
}

/** Cancela de una vez todas las filas de un festivo aplicado a todos los barberos. */
export async function cancelBatch(batchId, { cancelledBy } = {}) {
  const rows = await prisma.barberScheduleException.findMany({
    where: { batchId, cancelledAt: null },
  });
  if (rows.length === 0) throw httpError('No hay ausencias vigentes en ese lote.', 404);
  await prisma.barberScheduleException.updateMany({
    where: { batchId, cancelledAt: null },
    data: { cancelledAt: new Date(), cancelledBy: cancelledBy ?? null },
  });
  return { cancelled: rows.length };
}
