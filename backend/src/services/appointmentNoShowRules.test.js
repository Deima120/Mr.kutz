import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_SHOW_TOO_EARLY_MESSAGE,
  NO_SHOW_PAID_MESSAGE,
  NO_SHOW_LOCKED_MESSAGE,
  canMarkNoShow,
  assertCanMarkNoShow,
} from './appointmentNoShowRules.js';

function nowAt(isoColombiaLocal) {
  return new Date(`${isoColombiaLocal}-05:00`);
}

const cita = (status = 'scheduled') => ({
  appointmentDate: '2030-06-15',
  startTime: '12:00',
  status,
});

describe('canMarkNoShow', () => {
  it('rechaza antes de la hora de inicio', () => {
    assert.equal(canMarkNoShow(cita(), nowAt('2030-06-15T11:59:00')), false);
  });

  it('permite justo en la hora de inicio', () => {
    assert.equal(canMarkNoShow(cita(), nowAt('2030-06-15T12:00:00')), true);
  });

  it('permite después de la hora de inicio', () => {
    assert.equal(canMarkNoShow(cita(), nowAt('2030-06-15T12:01:00')), true);
  });

  it('acepta snake_case', () => {
    const row = { appointment_date: '2030-06-15', start_time: '12:00', status: 'scheduled' };
    assert.equal(canMarkNoShow(row, nowAt('2030-06-15T12:30:00')), true);
  });
});

describe('assertCanMarkNoShow', () => {
  const despues = nowAt('2030-06-15T12:30:00');

  it('permite desde scheduled y confirmed', () => {
    for (const status of ['scheduled', 'confirmed']) {
      assert.doesNotThrow(() => assertCanMarkNoShow(cita(status), despues), `falló con ${status}`);
    }
  });

  it('rechaza in_progress y completed (decisión del propietario, 2026-09-07)', () => {
    // Ver el comentario en NO_SHOW_SOURCE_STATUSES: esto deja "no asistió"
    // utilizable en la práctica solo para citas que nunca se confirmaron, ya que
    // la automatización pasa una confirmada a in_progress en el mismo instante
    // en que se cumple su hora de inicio.
    for (const status of ['in_progress', 'completed']) {
      assert.throws(
        () => assertCanMarkNoShow(cita(status), despues),
        { statusCode: 400, message: NO_SHOW_LOCKED_MESSAGE },
        `falló con ${status}`
      );
    }
  });

  it('rechaza reescribir un desenlace ya cerrado', () => {
    for (const status of ['cancelled', 'no_show']) {
      assert.throws(() => assertCanMarkNoShow(cita(status), despues), { statusCode: 400 });
    }
  });

  it('rechaza si la cita todavía no empieza', () => {
    assert.throws(
      () => assertCanMarkNoShow(cita(), nowAt('2030-06-15T11:00:00')),
      { statusCode: 400, message: NO_SHOW_TOO_EARLY_MESSAGE },
    );
  });

  it('rechaza si la cita tiene un cobro activo', () => {
    // Una cita cobrada es, por definición, una a la que el cliente asistió.
    assert.throws(
      () => assertCanMarkNoShow(cita('confirmed'), despues, { hasActivePayment: true }),
      { statusCode: 409, message: NO_SHOW_PAID_MESSAGE },
    );
  });

  it('devuelve 404 si no hay cita', () => {
    assert.throws(() => assertCanMarkNoShow(null, despues), { statusCode: 404 });
  });
});
