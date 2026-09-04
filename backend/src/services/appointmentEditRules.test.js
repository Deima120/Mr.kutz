import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IN_PROGRESS_EDIT_MESSAGE,
  CLOSED_EDIT_MESSAGE,
  assertAppointmentIsEditable,
  isRescheduleAttempt,
} from './appointmentEditRules.js';

/**
 * Cita del 2030-06-15, 12:00–12:30 Colombia (UTC-5). `status: 'confirmed'` a propósito:
 * es lo que queda en BD mientras el job de sincronización no ha corrido todavía.
 */
const APPT = {
  status: 'confirmed',
  appointmentDate: '2030-06-15',
  startTime: '12:00',
  endTime: '12:30',
};

function nowAt(isoColombiaLocal) {
  return new Date(`${isoColombiaLocal}-05:00`);
}

describe('isRescheduleAttempt', () => {
  it('detecta cambio de fecha u hora', () => {
    assert.equal(isRescheduleAttempt({ appointmentDate: '2030-06-16' }), true);
    assert.equal(isRescheduleAttempt({ startTime: '15:00' }), true);
  });

  it('detecta cambio de servicios, barbero o cliente', () => {
    assert.equal(isRescheduleAttempt({ serviceIds: [1, 2] }), true);
    assert.equal(isRescheduleAttempt({ serviceId: 3 }), true);
    assert.equal(isRescheduleAttempt({ barberId: 7 }), true);
    assert.equal(isRescheduleAttempt({ clientId: 9 }), true);
  });

  it('trata las notas vacías como cambio (borrar la nota también lo es)', () => {
    assert.equal(isRescheduleAttempt({ notes: '' }), true);
  });

  it('no considera reprogramación un cambio de estado', () => {
    assert.equal(isRescheduleAttempt({ status: 'cancelled', cancelReason: 'No puedo asistir' }), false);
    assert.equal(isRescheduleAttempt({ status: 'confirmed' }), false);
  });

  it('ignora payload vacío o nulo', () => {
    assert.equal(isRescheduleAttempt({}), false);
    assert.equal(isRescheduleAttempt(null), false);
    assert.equal(isRescheduleAttempt({ startTime: undefined }), false);
  });
});

describe('assertAppointmentIsEditable', () => {
  it('bloquea reprogramar una cita ya empezada aunque en BD siga como confirmed', () => {
    assert.throws(
      () => assertAppointmentIsEditable(APPT, { startTime: '15:00' }, nowAt('2030-06-15T12:10:00')),
      (err) => err.message === IN_PROGRESS_EDIT_MESSAGE && err.statusCode === 400
    );
  });

  it('permite reprogramar antes de la hora de inicio', () => {
    assert.doesNotThrow(() =>
      assertAppointmentIsEditable(APPT, { startTime: '15:00' }, nowAt('2030-06-15T11:59:00'))
    );
  });

  it('bloquea justo en el minuto de inicio', () => {
    assert.throws(() =>
      assertAppointmentIsEditable(APPT, { appointmentDate: '2030-06-20' }, nowAt('2030-06-15T12:00:00'))
    );
  });

  it('no bloquea un cambio de estado sobre una cita en curso (tiene su propia regla)', () => {
    assert.doesNotThrow(() =>
      assertAppointmentIsEditable(APPT, { status: 'cancelled' }, nowAt('2030-06-15T12:10:00'))
    );
  });

  /*
   * Antes se daba por hecho que de las citas cerradas ya se encargaba «la regla de
   * estados terminales». No es así: ese candado vive en el servicio y solo se
   * evalúa cuando el PUT trae `status`, de modo que un PUT con solo `startTime`
   * reprogramaba una cita ya completada y reescribía el pasado sin ningún error.
   */
  it('bloquea reprogramar una cita ya cerrada', () => {
    for (const status of ['completed', 'cancelled', 'no_show']) {
      const cerrada = { ...APPT, status };
      assert.throws(
        () => assertAppointmentIsEditable(cerrada, { startTime: '15:00' }, nowAt('2030-06-15T12:10:00')),
        (err) => err.message === CLOSED_EDIT_MESSAGE && err.statusCode === 400,
        `no bloqueó con ${status}`
      );
    }
  });

  it('sigue permitiendo cambiar el estado de una cita cerrada (tiene su propia regla)', () => {
    const completed = { ...APPT, status: 'completed' };
    assert.doesNotThrow(() =>
      assertAppointmentIsEditable(completed, { status: 'no_show' }, nowAt('2030-06-15T12:10:00'))
    );
  });

  it('tolera cita ausente', () => {
    assert.doesNotThrow(() => assertAppointmentIsEditable(null, { startTime: '15:00' }));
  });
});
