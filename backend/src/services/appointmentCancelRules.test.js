import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_CANCEL_LEAD_MESSAGE,
  assertClientCanCancelByLeadTime,
  canClientCancelByLeadTime,
} from './appointmentCancelRules.js';

/** Cita el 2030-06-15 a las 12:00 Colombia (UTC-5). */
const APPT = {
  appointmentDate: '2030-06-15',
  startTime: '12:00',
};

function nowAt(isoColombiaLocal) {
  // isoColombiaLocal: '2030-06-15T11:29:00' → interpretado como -05:00
  return new Date(`${isoColombiaLocal}-05:00`);
}

describe('canClientCancelByLeadTime', () => {
  it('permite cancelar con más de 60 minutos de anticipación (61 min)', () => {
    assert.equal(canClientCancelByLeadTime(APPT, nowAt('2030-06-15T10:59:00')), true);
  });

  it('rechaza en el límite exacto de 60 minutos', () => {
    assert.equal(canClientCancelByLeadTime(APPT, nowAt('2030-06-15T11:00:00')), false);
  });

  it('rechaza con menos de 60 minutos (59 min)', () => {
    assert.equal(canClientCancelByLeadTime(APPT, nowAt('2030-06-15T11:01:00')), false);
  });

  it('rechaza si la cita ya empezó', () => {
    assert.equal(canClientCancelByLeadTime(APPT, nowAt('2030-06-15T12:05:00')), false);
  });

  it('acepta snake_case appointment_date / start_time', () => {
    const appt = { appointment_date: '2030-06-15', start_time: '12:00' };
    assert.equal(canClientCancelByLeadTime(appt, nowAt('2030-06-15T10:00:00')), true);
  });
});

describe('assertClientCanCancelByLeadTime', () => {
  it('no lanza cuando hay margen suficiente', () => {
    assert.doesNotThrow(() =>
      assertClientCanCancelByLeadTime(APPT, nowAt('2030-06-15T10:00:00'))
    );
  });

  it('lanza 400 con mensaje claro cuando ya no hay margen', () => {
    try {
      assertClientCanCancelByLeadTime(APPT, nowAt('2030-06-15T11:30:00'));
      assert.fail('debía lanzar');
    } catch (err) {
      assert.equal(err.statusCode, 400);
      assert.equal(err.message, CLIENT_CANCEL_LEAD_MESSAGE);
    }
  });
});
