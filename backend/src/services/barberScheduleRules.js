/**
 * Reglas de horario de la barbería y de los barberos.
 *
 * Módulo puro: no toca base de datos ni red, así que se puede probar entero.
 * Es el único sitio donde vive el horario oficial del negocio; el sembrado al
 * crear un barbero, el script de estandarización y el cálculo de turnos
 * disponibles leen todos de aquí para que no puedan divergir.
 */

import { parseClockTime } from './appointment.time.helpers.js';

/** Horario oficial de la barbería. */
export const SHOP_HOURS = {
  /** Lunes (1) a sábado (6). */
  weekday: { start: '10:00', end: '20:00' },
  /** Domingo (0). */
  sunday: { start: '11:00', end: '18:00' },
  /** Festivos, cualquiera que sea el día de la semana en que caigan. */
  holiday: { start: '11:00', end: '18:00' },
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
export function shopWindowFor(dayOfWeek, { isHoliday = false } = {}) {
  if (isHoliday) return { ...SHOP_HOURS.holiday };
  return dayOfWeek === SUNDAY ? { ...SHOP_HOURS.sunday } : { ...SHOP_HOURS.weekday };
}

/**
 * Parte común de dos ventanas horarias. `null` si no se solapan.
 */
export function intersectWindows(a, b) {
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
  const start = Math.max(toMinutes(a.start), toMinutes(b.start));
  const end = Math.min(toMinutes(a.end), toMinutes(b.end));
  if (end <= start) return null;
  return { start: fromMinutes(start), end: fromMinutes(end) };
}

/** Día de la semana (0=domingo) de una fecha YYYY-MM-DD, sin depender de la zona. */
export function weekdayOfYmd(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

/**
 * Horario del **negocio** para un día concreto, aplicando excepción y festivo.
 *
 * Son los dos primeros escalones de la precedencia que usa `resolveDayWindow`,
 * sin la parte del barbero. Existe porque la pantalla de festivos y cierres tiene
 * que mostrarle al administrador cómo queda cada día *antes* de elegir barbero, y
 * calcularlo en el frontend obligaría a duplicar allí la regla.
 *
 * Es también la respuesta a «un festivo cae en lunes, ¿qué pasa con el lunes?»:
 * el festivo manda sobre el día de la semana, así que ese lunes se atiende
 * 11:00-18:00 en lugar de 10:00-20:00.
 *
 * @param {object} params
 * @param {number} params.dayOfWeek 0=domingo … 6=sábado
 * @param {boolean} [params.isHoliday]
 * @param {{isClosed:boolean,startTime?:string|null,endTime?:string|null}|null} [params.exception]
 * @returns {{ open: boolean, start?: string, end?: string, reason: string }}
 */
export function resolveShopDayWindow({ dayOfWeek, isHoliday = false, exception = null }) {
  if (exception?.isClosed) {
    return { open: false, reason: 'exception_closed' };
  }

  if (exception && exception.startTime && exception.endTime) {
    return { open: true, start: exception.startTime, end: exception.endTime, reason: 'exception_hours' };
  }

  // Excepción sin horas y sin cierre: el día vuelve a ser normal aunque el
  // calendario diga que es festivo. Es la forma de decir "este festivo se trabaja".
  if (exception) {
    return { open: true, ...shopWindowFor(dayOfWeek), reason: 'exception_normal_day' };
  }

  if (isHoliday) {
    return { open: true, ...shopWindowFor(dayOfWeek, { isHoliday: true }), reason: 'holiday_hours' };
  }

  return { open: true, ...shopWindowFor(dayOfWeek), reason: 'shop_default' };
}

/**
 * Decide si un barbero atiende un día concreto y en qué franja.
 *
 * Orden de precedencia, de mayor a menor:
 *
 *  1. **Excepción manual del administrador.** Manda siempre sobre el cálculo
 *     automático: puede cerrar el día, imponer un horario especial, o —si no
 *     trae horas ni cierra— anular el festivo para que sea un día normal.
 *  2. **Festivo colombiano.** Cambia la ventana de la barbería a la de festivo.
 *  3. **Horario del barbero.** Se aplica siempre encima de lo anterior: un
 *     festivo cambia el horario, pero *no abre* un día que el barbero tiene
 *     marcado como no disponible.
 *
 * En un día normal (sin festivo ni excepción) manda el horario del barbero tal
 * cual, sin recortarlo con el de la barbería: así un barbero que abra antes o
 * cierre más tarde no se ve encogido en silencio.
 *
 * @param {object} params
 * @param {number} params.dayOfWeek 0=domingo … 6=sábado
 * @param {Array<{dayOfWeek:number,startTime:string,endTime:string,isAvailable:boolean}>} params.barberRows
 *   Semana completa del barbero tal como está en base de datos (puede venir vacía).
 * @param {boolean} [params.isHoliday]
 * @param {{isClosed:boolean,startTime?:string|null,endTime?:string|null}|null} [params.exception]
 * @returns {{ open: boolean, start?: string, end?: string, reason: string }}
 */
export function resolveDayWindow({ dayOfWeek, barberRows = [], isHoliday = false, exception = null }) {
  // 1. Excepción manual: cierre total.
  if (exception?.isClosed) {
    return { open: false, reason: 'exception_closed' };
  }

  // Una excepción sin horas y sin cierre significa "este día es normal aunque el
  // calendario diga que es festivo".
  const exceptionWindow =
    exception && exception.startTime && exception.endTime
      ? { start: exception.startTime, end: exception.endTime }
      : null;
  const holidayApplies = isHoliday && !exception;

  const row = barberRows.find((r) => Number(r.dayOfWeek) === Number(dayOfWeek));

  // Barbero sin ninguna fila: red de seguridad para que no se quede sin agenda.
  // Se le aplica el horario de la barbería en lugar de dejarlo sin turnos.
  if (barberRows.length === 0) {
    const base = exceptionWindow ?? shopWindowFor(dayOfWeek, { isHoliday: holidayApplies });
    return { open: true, ...base, reason: 'shop_default' };
  }

  // Tiene semana configurada pero este día no aparece: se considera cerrado.
  if (!row) {
    return { open: false, reason: 'day_not_configured' };
  }

  // El barbero libra ese día: ni un festivo ni una excepción con horario lo abren.
  if (row.isAvailable === false) {
    return { open: false, reason: 'barber_unavailable' };
  }

  const barberWindow = { start: row.startTime, end: row.endTime };

  // Día normal: manda el barbero, sin recorte.
  if (!exceptionWindow && !holidayApplies) {
    return { open: true, ...barberWindow, reason: 'barber_schedule' };
  }

  // Festivo o excepción con horario: la franja final es la parte común.
  const override = exceptionWindow ?? shopWindowFor(dayOfWeek, { isHoliday: true });
  const combinada = intersectWindows(override, barberWindow);
  if (!combinada) {
    return { open: false, reason: 'no_overlap_with_override' };
  }
  return {
    open: true,
    ...combinada,
    reason: exceptionWindow ? 'exception_hours' : 'holiday_hours',
  };
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
