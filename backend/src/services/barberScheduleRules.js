/**
 * Reglas de horario de la barbería y de los barberos.
 *
 * Módulo puro: no toca base de datos ni red, así que se puede probar entero.
 * Es el único sitio donde vive el horario oficial del negocio; el sembrado al
 * crear un barbero, el script de estandarización y el cálculo de turnos
 * disponibles leen todos de aquí para que no puedan divergir.
 *
 * Hubo aquí una capa de festivos colombianos y excepciones de calendario que se
 * retiró; el diseño está documentado en `docs/MODULO-FESTIVOS-Y-CIERRES.md` por si
 * algún día se retoma.
 */

import { parseClockTime } from './appointment.time.helpers.js';

/** Horario oficial de la barbería. */
export const SHOP_HOURS = {
  /** Lunes (1) a sábado (6). */
  weekday: { start: '10:00', end: '20:00' },
  /** Domingo (0). */
  sunday: { start: '11:00', end: '18:00' },
};

/** dayOfWeek sigue la convención de JavaScript: 0=domingo … 6=sábado. */
export const SUNDAY = 0;

/**
 * Semana estándar con la que nace un barbero nuevo y con la que se estandarizan
 * los existentes. Los siete días quedan disponibles; si un barbero libra algún
 * día, el administrador lo desmarca desde su pantalla de horarios.
 */
export const DEFAULT_BARBER_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => {
  const horas = dayOfWeek === SUNDAY ? SHOP_HOURS.sunday : SHOP_HOURS.weekday;
  return {
    dayOfWeek,
    startTime: horas.start,
    endTime: horas.end,
    isAvailable: true,
  };
});

export const toMinutes = (hhmm) => parseClockTime(hhmm).totalMinutes;

export const fromMinutes = (total) => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Ventana horaria de la barbería para un día concreto. */
export function shopWindowFor(dayOfWeek) {
  return dayOfWeek === SUNDAY ? { ...SHOP_HOURS.sunday } : { ...SHOP_HOURS.weekday };
}

/** Día de la semana (0=domingo) de una fecha YYYY-MM-DD, sin depender de la zona. */
export function weekdayOfYmd(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

/**
 * Decide si un barbero atiende un día concreto y en qué franja.
 *
 * Manda el horario del barbero tal cual, sin recortarlo con el de la barbería:
 * así un barbero que abra antes o cierre más tarde no se ve encogido en silencio.
 *
 * @param {object} params
 * @param {number} params.dayOfWeek 0=domingo … 6=sábado
 * @param {Array<{dayOfWeek:number,startTime:string,endTime:string,isAvailable:boolean}>} params.barberRows
 *   Semana completa del barbero tal como está en base de datos (puede venir vacía).
 * @returns {{ open: boolean, start?: string, end?: string, reason: string }}
 */
export function resolveDayWindow({ dayOfWeek, barberRows = [] }) {
  // Barbero sin ninguna fila: red de seguridad para que no se quede sin agenda.
  // Se le aplica el horario de la barbería en lugar de dejarlo sin turnos.
  if (barberRows.length === 0) {
    return { open: true, ...shopWindowFor(dayOfWeek), reason: 'shop_default' };
  }

  const row = barberRows.find((r) => Number(r.dayOfWeek) === Number(dayOfWeek));

  // Tiene semana configurada pero este día no aparece: se considera cerrado.
  if (!row) {
    return { open: false, reason: 'day_not_configured' };
  }

  // El barbero libra ese día.
  if (row.isAvailable === false) {
    return { open: false, reason: 'barber_unavailable' };
  }

  return { open: true, start: row.startTime, end: row.endTime, reason: 'barber_schedule' };
}

/**
 * Normaliza y valida lo que llega del formulario de horarios.
 *
 * Rechaza días repetidos: sin esta comprobación la petición reventaba con un 500
 * al chocar contra la restricción única `[barberId, dayOfWeek]` de la tabla.
 *
 * @param {Array<object>} schedules
 * @returns {Array<{dayOfWeek:number,startTime:string,endTime:string,isAvailable:boolean}>}
 */
export function normalizeScheduleInput(schedules) {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    const err = new Error('Indica los horarios de la semana.');
    err.statusCode = 400;
    throw err;
  }

  const vistos = new Set();
  return schedules.map((s) => {
    const dayOfWeek = Number(s.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      const err = new Error('Día de la semana no válido.');
      err.statusCode = 400;
      throw err;
    }
    if (vistos.has(dayOfWeek)) {
      const err = new Error('Hay días repetidos en los horarios enviados.');
      err.statusCode = 400;
      throw err;
    }
    vistos.add(dayOfWeek);

    const isAvailable = s.isAvailable !== false;
    const porDefecto = DEFAULT_BARBER_WEEK[dayOfWeek];

    // Un día cerrado puede llegar sin horas: se guardan las estándar para que al
    // reactivarlo quede con el horario del negocio y no con uno inventado.
    const startTime = parseClockTime(s.startTime || porDefecto.startTime).normalized;
    const endTime = parseClockTime(s.endTime || porDefecto.endTime).normalized;

    if (isAvailable && toMinutes(startTime) >= toMinutes(endTime)) {
      const err = new Error('La hora de inicio debe ser anterior a la de fin.');
      err.statusCode = 400;
      throw err;
    }

    return { dayOfWeek, startTime, endTime, isAvailable };
  });
}
