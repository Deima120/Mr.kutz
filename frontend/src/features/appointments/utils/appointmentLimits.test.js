import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PENDING_APPOINTMENTS_PER_CLIENT,
  isPendingAppointment,
  countPendingAppointments,
  pendingLimitMessage,
} from './appointmentLimits.js';

/** Hora de Colombia (UTC-5) escrita como instante absoluto. */
function nowAt(isoColombiaLocal) {
  return new Date(`${isoColombiaLocal}-05:00`);
}

const cita = (overrides = {}) => ({
  status: 'scheduled',
  appointment_date: '2030-06-15',
  start_time: '12:00',
  ...overrides,
});

describe('isPendingAppointment', () => {
  it('cuenta una cita que todavía no ha empezado', () => {
    assert.equal(isPendingAppointment(cita(), nowAt('2030-06-15T11:59:00')), true);
  });

  /*
   * El caso que motivó el espejo: filtrando solo por fecha, la cita de esta misma
   * mañana seguía contando y el aviso bloqueaba el botón para algo que el backend
   * sí habría aceptado.
   */
  it('NO cuenta una cita de hoy cuya hora ya pasó', () => {
    assert.equal(isPendingAppointment(cita(), nowAt('2030-06-15T12:00:00')), false);
    assert.equal(isPendingAppointment(cita(), nowAt('2030-06-15T15:00:00')), false);
  });

  it('no cuenta los estados terminales', () => {
    for (const status of ['cancelled', 'no_show', 'completed']) {
      assert.equal(
        isPendingAppointment(cita({ status }), nowAt('2030-06-15T11:00:00')),
        false,
        `contó una cita ${status}`,
      );
    }
  });

  it('cuenta las confirmadas igual que las agendadas', () => {
    assert.equal(
      isPendingAppointment(cita({ status: 'confirmed' }), nowAt('2030-06-15T11:00:00')),
      true,
    );
  });

  it('acepta camelCase además de snake_case', () => {
    const row = { status: 'scheduled', appointmentDate: '2030-06-15', startTime: '12:00' };
    assert.equal(isPendingAppointment(row, nowAt('2030-06-15T11:00:00')), true);
  });

  it('sin hora utilizable cuenta, que es el lado conservador', () => {
    assert.equal(isPendingAppointment({ status: 'scheduled' }, nowAt('2030-06-15T11:00:00')), true);
  });

  it('tolera valores ausentes', () => {
    assert.equal(isPendingAppointment(null), false);
  });
});

describe('countPendingAppointments', () => {
  it('cuenta solo las que ocupan cupo', () => {
    const filas = [
      cita({ start_time: '18:00' }),
      cita({ start_time: '09:00' }),
      cita({ status: 'cancelled', start_time: '20:00' }),
      cita({ status: 'confirmed', start_time: '19:00' }),
    ];
    assert.equal(countPendingAppointments(filas, nowAt('2030-06-15T12:00:00')), 2);
  });

  it('tolera entradas no utilizables', () => {
    assert.equal(countPendingAppointments([], nowAt('2030-06-15T12:00:00')), 0);
    assert.equal(countPendingAppointments(null), 0);
    assert.equal(countPendingAppointments(undefined), 0);
  });
});

describe('pendingLimitMessage', () => {
  it('nombra el tope vigente', () => {
    assert.match(pendingLimitMessage(), new RegExp(String(MAX_PENDING_APPOINTMENTS_PER_CLIENT)));
  });
});
