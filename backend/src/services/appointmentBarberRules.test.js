import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BARBER_NOT_OWNER_MESSAGE,
  BARBER_NO_PROFILE_MESSAGE,
  BARBER_STATUS_MESSAGE,
  BARBER_TERMINAL_MESSAGE,
  canBarberUpdate,
  stripBarberForbiddenFields,
} from './appointmentBarberRules.js';

const BARBER_ID = 7;
const OWN = { barberId: BARBER_ID, status: 'scheduled' };

describe('canBarberUpdate — propiedad de la cita', () => {
  it('permite confirmar una cita propia', () => {
    assert.deepEqual(canBarberUpdate(OWN, BARBER_ID, { status: 'confirmed' }), { ok: true });
  });

  it('rechaza una cita de otro barbero', () => {
    const res = canBarberUpdate({ barberId: 99, status: 'scheduled' }, BARBER_ID, {
      status: 'confirmed',
    });
    assert.equal(res.ok, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.message, BARBER_NOT_OWNER_MESSAGE);
  });

  it('compara los ids como números (tolera strings del JWT o de la ruta)', () => {
    assert.deepEqual(canBarberUpdate({ barberId: '7', status: 'scheduled' }, '7', {
      status: 'confirmed',
    }), { ok: true });
  });

  it('rechaza si el usuario no tiene perfil de barbero vinculado', () => {
    const res = canBarberUpdate(OWN, null, { status: 'confirmed' });
    assert.equal(res.ok, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.message, BARBER_NO_PROFILE_MESSAGE);
  });

  it('devuelve 404 si la cita no existe', () => {
    const res = canBarberUpdate(null, BARBER_ID, { status: 'confirmed' });
    assert.equal(res.ok, false);
    assert.equal(res.statusCode, 404);
  });
});

describe('canBarberUpdate — estados permitidos', () => {
  for (const status of ['confirmed', 'cancelled']) {
    it(`permite fijar "${status}"`, () => {
      assert.deepEqual(canBarberUpdate(OWN, BARBER_ID, { status }), { ok: true });
    });
  }

  for (const status of ['in_progress', 'completed', 'no_show', 'scheduled']) {
    it(`rechaza "${status}" porque no es una transición del barbero`, () => {
      const res = canBarberUpdate(OWN, BARBER_ID, { status });
      assert.equal(res.ok, false);
      assert.equal(res.statusCode, 403);
      assert.equal(res.message, BARBER_STATUS_MESSAGE);
    });
  }

  it('rechaza una petición sin status: no hay ningún otro campo que pueda tocar', () => {
    const res = canBarberUpdate(OWN, BARBER_ID, { notes: 'hola' });
    assert.equal(res.ok, false);
    assert.equal(res.statusCode, 403);
  });
});

describe('canBarberUpdate — estados terminales', () => {
  for (const status of ['cancelled', 'no_show', 'completed']) {
    it(`no deja tocar una cita ya en "${status}"`, () => {
      const res = canBarberUpdate({ barberId: BARBER_ID, status }, BARBER_ID, {
        status: 'confirmed',
      });
      assert.equal(res.ok, false);
      assert.equal(res.statusCode, 400);
      assert.equal(res.message, BARBER_TERMINAL_MESSAGE);
    });
  }

  it('sí deja cancelar una cita que ya estaba confirmada', () => {
    const res = canBarberUpdate({ barberId: BARBER_ID, status: 'confirmed' }, BARBER_ID, {
      status: 'cancelled',
    });
    assert.deepEqual(res, { ok: true });
  });

  it('deja cancelar una cita en progreso (el servicio pudo interrumpirse)', () => {
    const res = canBarberUpdate({ barberId: BARBER_ID, status: 'in_progress' }, BARBER_ID, {
      status: 'cancelled',
    });
    assert.deepEqual(res, { ok: true });
  });
});

describe('stripBarberForbiddenFields', () => {
  it('elimina reprogramación, servicios y reasignación de cita', () => {
    const clean = stripBarberForbiddenFields({
      status: 'cancelled',
      cancelReason: 'El cliente avisó',
      clientId: 1,
      barberId: 2,
      serviceId: 3,
      serviceIds: [3, 4],
      appointmentDate: '2030-01-01',
      startTime: '10:00',
    });

    assert.deepEqual(clean, { status: 'cancelled', cancelReason: 'El cliente avisó' });
  });

  it('no muta el objeto original', () => {
    const body = { status: 'confirmed', clientId: 1 };
    stripBarberForbiddenFields(body);
    assert.equal(body.clientId, 1);
  });

  it('tolera un cuerpo vacío', () => {
    assert.deepEqual(stripBarberForbiddenFields(), {});
  });
});
