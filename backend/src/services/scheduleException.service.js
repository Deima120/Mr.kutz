/**
 * Excepciones del calendario de la barbería.
 *
 * Los festivos colombianos se calculan (ver `utils/colombianHolidays.js`); esta
 * capa cubre solo lo que el calendario no puede saber: cierres puntuales,
 * horarios especiales, o declarar que un festivo se trabaja con normalidad.
 * Una excepción manda siempre sobre el festivo calculado.
 */

import prisma from '../lib/prisma.js';
import { ymdToUtcDate, timeStrFromRecord } from '../utils/colombiaTime.js';
import { parseClockTime, clockTimeToDate } from './appointment.time.helpers.js';
import { getColombianHolidays } from '../utils/colombianHolidays.js';
import { resolveShopDayWindow, weekdayOfYmd } from './barberScheduleRules.js';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

const httpError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toDto = (row) =>
  row
    ? {
        id: row.id,
        date: row.date.toISOString().slice(0, 10),
        is_closed: row.isClosed,
        start_time: row.startTime ? timeStrFromRecord(row.startTime) : null,
        end_time: row.endTime ? timeStrFromRecord(row.endTime) : null,
        reason: row.reason,
      }
    : null;

function assertYmd(fecha) {
  const str = String(fecha ?? '').trim();
  if (!YMD_RE.test(str)) throw httpError('Indica una fecha válida (AAAA-MM-DD).');
  return str;
}

/**
 * Excepción de un día concreto, en la forma que espera `resolveDayWindow`.
 * Devuelve `null` si ese día no tiene excepción.
 */
export const getForDate = async (fecha) => {
  const str = String(fecha ?? '').trim();
  if (!YMD_RE.test(str)) return null;

  const row = await prisma.scheduleException.findUnique({
    where: { date: ymdToUtcDate(str) },
  });
  if (!row) return null;

  return {
    isClosed: row.isClosed,
    startTime: row.startTime ? timeStrFromRecord(row.startTime) : null,
    endTime: row.endTime ? timeStrFromRecord(row.endTime) : null,
    reason: row.reason,
  };
};

/** Excepciones dentro de un rango de fechas (ambos extremos incluidos). */
export const list = async ({ from, to } = {}) => {
  const where = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: ymdToUtcDate(assertYmd(from)) } : {}),
      ...(to ? { lte: ymdToUtcDate(assertYmd(to)) } : {}),
    };
  }
  const rows = await prisma.scheduleException.findMany({ where, orderBy: { date: 'asc' } });
  return rows.map(toDto);
};

/**
 * Calendario resuelto de un año: los festivos calculados fusionados con las
 * excepciones cargadas. Es lo que consume la pantalla del administrador.
 */
export const getCalendar = async (year) => {
  const anio = parseInt(year, 10);
  if (!Number.isInteger(anio)) throw httpError('Indica un año válido.');

  const festivos = getColombianHolidays(anio);
  const excepciones = await list({ from: `${anio}-01-01`, to: `${anio}-12-31` });
  const porFecha = new Map(excepciones.map((e) => [e.date, e]));

  /**
   * Añade a cada día el horario con el que queda realmente el negocio.
   *
   * Se resuelve aquí y no en el frontend para que la pantalla no tenga que
   * duplicar la regla de precedencia. Es la respuesta visible a «este festivo cae
   * en lunes, ¿a qué hora abrimos?».
   */
  const conHorario = (dia, ex, esFestivo) => {
    const ventana = resolveShopDayWindow({
      dayOfWeek: weekdayOfYmd(dia.date),
      isHoliday: esFestivo,
      exception: ex
        ? { isClosed: ex.is_closed, startTime: ex.start_time, endTime: ex.end_time }
        : null,
    });
    return {
      ...dia,
      day_of_week: weekdayOfYmd(dia.date),
      effective_closed: !ventana.open,
      effective_start: ventana.start ?? null,
      effective_end: ventana.end ?? null,
      effective_reason: ventana.reason,
    };
  };

  const dias = festivos.map((f) => {
    const ex = porFecha.get(f.date);
    porFecha.delete(f.date);
    return conHorario(
      {
        date: f.date,
        name: f.name,
        source: ex ? 'festivo+excepcion' : 'festivo',
        is_closed: ex ? ex.is_closed : false,
        start_time: ex?.start_time ?? null,
        end_time: ex?.end_time ?? null,
        reason: ex?.reason ?? null,
        exception_id: ex?.id ?? null,
      },
      ex,
      true,
    );
  });

  // Las excepciones que no caen en festivo se añaden como días propios.
  for (const ex of porFecha.values()) {
    dias.push(
      conHorario(
        {
          date: ex.date,
          name: ex.reason || 'Excepción',
          source: 'excepcion',
          is_closed: ex.is_closed,
          start_time: ex.start_time,
          end_time: ex.end_time,
          reason: ex.reason,
          exception_id: ex.id,
        },
        ex,
        false,
      ),
    );
  }

  return dias.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Crea o reemplaza la excepción de una fecha.
 *
 * Se usa `upsert` sobre la fecha (que es única) porque desde el panel «marcar
 * este día» es la misma acción tanto si ya existía como si no.
 */
export const upsert = async ({ date, isClosed = false, startTime, endTime, reason }) => {
  const fecha = assertYmd(date);
  const cerrado = Boolean(isClosed);

  let inicio = null;
  let fin = null;
  if (!cerrado && (startTime || endTime)) {
    if (!startTime || !endTime) {
      throw httpError('Indica la hora de inicio y la de fin, o deja ambas vacías.');
    }
    const p1 = parseClockTime(startTime);
    const p2 = parseClockTime(endTime, { field: 'endTime' });
    if (p1.totalMinutes >= p2.totalMinutes) {
      throw httpError('La hora de inicio debe ser anterior a la de fin.');
    }
    inicio = clockTimeToDate(p1);
    fin = clockTimeToDate(p2);
  }

  const datos = {
    isClosed: cerrado,
    startTime: inicio,
    endTime: fin,
    reason: reason ? String(reason).trim().slice(0, 200) : null,
  };

  const row = await prisma.scheduleException.upsert({
    where: { date: ymdToUtcDate(fecha) },
    update: datos,
    create: { date: ymdToUtcDate(fecha), ...datos },
  });
  return toDto(row);
};

export const remove = async (id) => {
  const exId = parseInt(id, 10);
  const existe = await prisma.scheduleException.findUnique({ where: { id: exId } });
  if (!existe) return null;
  await prisma.scheduleException.delete({ where: { id: exId } });
  return true;
};
