import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOP_HOURS,
  DEFAULT_BARBER_WEEK,
  shopWindowFor,
  intersectWindows,
  resolveDayWindow,
  normalizeScheduleInput,
} from './barberScheduleRules.js';
import { parseClockTime, clockTimeToDate } from './appointment.time.helpers.js';
import { timeStrFromRecord } from '../utils/colombiaTime.js';

/** Semana completa disponible con el mismo horario todos los días. */
const semana = (start, end, overrides = {}) =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: start,
    endTime: end,
    isAvailable: true,
    ...(overrides[dayOfWeek] ?? {}),
  }));

describe('ida y vuelta de la hora (regresión del desfase de zona horaria)', () => {
  // El bug original: la hora se escribía interpretándola en la zona del servidor
  // (UTC en Render, UTC-5 en local), así que lo guardado dependía de dónde
  // corriera el proceso. La comprobación se hace contra toISOString(), que es
  // independiente de la zona de la máquina que ejecuta el test.
  it('guarda la hora como reloj de pared en UTC', () => {
    assert.equal(
      clockTimeToDate(parseClockTime('18:00')).toISOString(),
      '1970-01-01T18:00:00.000Z'
    );
    assert.equal(
      clockTimeToDate(parseClockTime('09:05')).toISOString(),
      '1970-01-01T09:05:00.000Z'
    );
  });

  it('lo que se guarda es exactamente lo que se lee', () => {
    for (const hora of ['00:00', '09:00', '10:00', '11:30', '18:00', '20:00', '23:59']) {
      const guardado = clockTimeToDate(parseClockTime(hora));
      assert.equal(timeStrFromRecord(guardado), hora, `no sobrevivió la ida y vuelta: ${hora}`);
    }
  });
});

describe('horario estándar del negocio', () => {
  it('define lunes a sábado 10:00-20:00 y domingo 11:00-18:00', () => {
    assert.deepEqual(SHOP_HOURS.weekday, { start: '10:00', end: '20:00' });
    assert.deepEqual(SHOP_HOURS.sunday, { start: '11:00', end: '18:00' });
    assert.deepEqual(SHOP_HOURS.holiday, { start: '11:00', end: '18:00' });
  });

  it('la semana por defecto cubre los 7 días y todos disponibles', () => {
    assert.equal(DEFAULT_BARBER_WEEK.length, 7);
    assert.ok(DEFAULT_BARBER_WEEK.every((d) => d.isAvailable));
    assert.equal(DEFAULT_BARBER_WEEK[0].startTime, '11:00'); // domingo
    assert.equal(DEFAULT_BARBER_WEEK[1].startTime, '10:00'); // lunes
    assert.equal(DEFAULT_BARBER_WEEK[6].endTime, '20:00'); // sábado
  });

  it('shopWindowFor distingue domingo, entre semana y festivo', () => {
    assert.deepEqual(shopWindowFor(3), { start: '10:00', end: '20:00' });
    assert.deepEqual(shopWindowFor(0), { start: '11:00', end: '18:00' });
    assert.deepEqual(shopWindowFor(3, { isHoliday: true }), { start: '11:00', end: '18:00' });
  });
});

describe('intersectWindows', () => {
  it('devuelve la parte común', () => {
    assert.deepEqual(
      intersectWindows({ start: '11:00', end: '18:00' }, { start: '10:00', end: '20:00' }),
      { start: '11:00', end: '18:00' }
    );
    assert.deepEqual(
      intersectWindows({ start: '11:00', end: '18:00' }, { start: '12:00', end: '16:00' }),
      { start: '12:00', end: '16:00' }
    );
  });

  it('devuelve null si no se solapan', () => {
    assert.equal(
      intersectWindows({ start: '11:00', end: '18:00' }, { start: '08:00', end: '10:00' }),
      null
    );
  });

  it('trata como vacío el solape de un instante', () => {
    assert.equal(
      intersectWindows({ start: '11:00', end: '18:00' }, { start: '18:00', end: '20:00' }),
      null
    );
  });
});

describe('resolveDayWindow — barbero sin horarios cargados', () => {
  it('cae al horario de la barbería en lugar de quedarse sin agenda', () => {
    const r = resolveDayWindow({ dayOfWeek: 3, barberRows: [] });
    assert.equal(r.open, true);
    assert.equal(r.start, '10:00');
    assert.equal(r.end, '20:00');
  });

  it('usa el horario de domingo cuando toca domingo', () => {
    const r = resolveDayWindow({ dayOfWeek: 0, barberRows: [] });
    assert.deepEqual([r.start, r.end], ['11:00', '18:00']);
  });
});

describe('resolveDayWindow — días cerrados (bug de los turnos fantasma)', () => {
  it('un día no disponible no ofrece turnos', () => {
    const rows = semana('10:00', '20:00', { 0: { isAvailable: false } });
    assert.equal(resolveDayWindow({ dayOfWeek: 0, barberRows: rows }).open, false);
  });

  it('un festivo no abre un día que el barbero tiene cerrado', () => {
    const rows = semana('10:00', '20:00', { 0: { isAvailable: false } });
    const r = resolveDayWindow({ dayOfWeek: 0, barberRows: rows, isHoliday: true });
    assert.equal(r.open, false);
  });

  it('una excepción con horario especial tampoco abre un día cerrado', () => {
    const rows = semana('10:00', '20:00', { 2: { isAvailable: false } });
    const r = resolveDayWindow({
      dayOfWeek: 2,
      barberRows: rows,
      exception: { isClosed: false, startTime: '11:00', endTime: '18:00' },
    });
    assert.equal(r.open, false);
  });

  it('si el barbero tiene semana pero le falta ese día, se considera cerrado', () => {
    const rows = semana('10:00', '20:00').filter((d) => d.dayOfWeek !== 4);
    assert.equal(resolveDayWindow({ dayOfWeek: 4, barberRows: rows }).open, false);
  });
});

describe('resolveDayWindow — día normal', () => {
  it('manda el horario del barbero sin recortarlo con el de la barbería', () => {
    // Protege al barbero que abre antes de las 10:00: no debe encogerse solo.
    const rows = semana('09:00', '15:00');
    const r = resolveDayWindow({ dayOfWeek: 2, barberRows: rows });
    assert.deepEqual([r.open, r.start, r.end], [true, '09:00', '15:00']);
  });
});

describe('resolveDayWindow — festivos', () => {
  it('aplica el horario de festivo recortando el del barbero', () => {
    const rows = semana('10:00', '20:00');
    const r = resolveDayWindow({ dayOfWeek: 1, barberRows: rows, isHoliday: true });
    assert.deepEqual([r.start, r.end], ['11:00', '18:00']);
  });

  it('respeta el horario del barbero si es más corto que el de festivo', () => {
    const rows = semana('12:00', '16:00');
    const r = resolveDayWindow({ dayOfWeek: 1, barberRows: rows, isHoliday: true });
    assert.deepEqual([r.start, r.end], ['12:00', '16:00']);
  });

  it('cierra si el horario del barbero no solapa con el de festivo', () => {
    const rows = semana('07:00', '10:00');
    const r = resolveDayWindow({ dayOfWeek: 1, barberRows: rows, isHoliday: true });
    assert.equal(r.open, false);
  });
});

describe('resolveDayWindow — excepciones del administrador', () => {
  it('un cierre manual gana sobre todo lo demás', () => {
    const rows = semana('10:00', '20:00');
    const r = resolveDayWindow({
      dayOfWeek: 1,
      barberRows: rows,
      isHoliday: true,
      exception: { isClosed: true },
    });
    assert.equal(r.open, false);
  });

  it('un horario especial gana sobre el de festivo', () => {
    const rows = semana('10:00', '20:00');
    const r = resolveDayWindow({
      dayOfWeek: 1,
      barberRows: rows,
      isHoliday: true,
      exception: { isClosed: false, startTime: '14:00', endTime: '19:00' },
    });
    assert.deepEqual([r.start, r.end], ['14:00', '19:00']);
  });

  it('una excepción sin horas anula el festivo y deja el día normal', () => {
    // Sirve para trabajar con normalidad un día que el calendario da por festivo.
    const rows = semana('10:00', '20:00');
    const r = resolveDayWindow({
      dayOfWeek: 1,
      barberRows: rows,
      isHoliday: true,
      exception: { isClosed: false },
    });
    assert.deepEqual([r.start, r.end], ['10:00', '20:00']);
  });
});

describe('normalizeScheduleInput', () => {
  it('normaliza y conserva los siete días', () => {
    const salida = normalizeScheduleInput(DEFAULT_BARBER_WEEK);
    assert.equal(salida.length, 7);
    assert.deepEqual(salida[1], {
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '20:00',
      isAvailable: true,
    });
  });

  it('rechaza días repetidos en vez de reventar contra la restricción única', () => {
    const repetido = [
      { dayOfWeek: 1, startTime: '10:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: 1, startTime: '11:00', endTime: '19:00', isAvailable: true },
    ];
    assert.throws(() => normalizeScheduleInput(repetido), { statusCode: 400 });
  });

  it('rechaza una hora de fin anterior o igual a la de inicio', () => {
    const invalido = [{ dayOfWeek: 1, startTime: '18:00', endTime: '03:00', isAvailable: true }];
    assert.throws(() => normalizeScheduleInput(invalido), { statusCode: 400 });
  });

  it('permite rango invertido si el día está cerrado, y lo normaliza al estándar', () => {
    const cerrado = [{ dayOfWeek: 0, startTime: '', endTime: '', isAvailable: false }];
    const salida = normalizeScheduleInput(cerrado);
    assert.deepEqual(salida[0], {
      dayOfWeek: 0,
      startTime: '11:00',
      endTime: '18:00',
      isAvailable: false,
    });
  });

  it('rechaza un día de la semana fuera de rango', () => {
    assert.throws(
      () => normalizeScheduleInput([{ dayOfWeek: 9, startTime: '10:00', endTime: '20:00' }]),
      { statusCode: 400 }
    );
  });

  it('rechaza una lista vacía', () => {
    assert.throws(() => normalizeScheduleInput([]), { statusCode: 400 });
  });
});
