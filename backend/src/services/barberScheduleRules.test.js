import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOP_HOURS,
  DEFAULT_BARBER_WEEK,
  shopWindowFor,
  resolveDayWindow,
  weekdayOfYmd,
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
  });

  it('la semana por defecto cubre los 7 días y todos disponibles', () => {
    assert.equal(DEFAULT_BARBER_WEEK.length, 7);
    assert.ok(DEFAULT_BARBER_WEEK.every((d) => d.isAvailable));
    assert.equal(DEFAULT_BARBER_WEEK[0].startTime, '11:00'); // domingo
    assert.equal(DEFAULT_BARBER_WEEK[1].startTime, '10:00'); // lunes
    assert.equal(DEFAULT_BARBER_WEEK[6].endTime, '20:00'); // sábado
  });

  it('shopWindowFor distingue domingo de entre semana', () => {
    assert.deepEqual(shopWindowFor(3), { start: '10:00', end: '20:00' });
    assert.deepEqual(shopWindowFor(0), { start: '11:00', end: '18:00' });
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


describe('weekdayOfYmd', () => {
  it('devuelve el día de la semana sin depender de la zona horaria', () => {
    // 2026-01-01 fue jueves; 2026-01-05, lunes; 2026-01-04, domingo.
    assert.equal(weekdayOfYmd('2026-01-01'), 4);
    assert.equal(weekdayOfYmd('2026-01-04'), 0);
    assert.equal(weekdayOfYmd('2026-01-05'), 1);
  });

  it('coincide con el día que resuelve el barbero para esa misma fecha', () => {
    // 2026-01-12 fue lunes: el barbero atiende con su horario de entre semana.
    const dayOfWeek = weekdayOfYmd('2026-01-12');
    const v = resolveDayWindow({ dayOfWeek, barberRows: semana('10:00', '20:00') });
    assert.deepEqual(v, { open: true, start: '10:00', end: '20:00', reason: 'barber_schedule' });
  });
});
