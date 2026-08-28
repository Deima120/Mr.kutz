import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PENDING_APPOINTMENTS_PER_CLIENT,
  APPOINTMENT_LIMIT_REASON,
  isPendingAppointment,
  countPendingAppointments,
  assertUnderPendingLimit,
} from './appointmentLimitRules.js';

function nowAt(isoColombiaLocal) {
  // isoColombiaLocal: '2030-06-15T11:00:00' → interpretado como -05:00
  return new Date(`${isoColombiaLocal}-05:00`);
}

/** Cita futura respecto a NOW por defecto. */
const futura = (status = 'scheduled') => ({
  appointmentDate: '2030-06-15',
  startTime: '12:00',
  status,
});

const NOW = nowAt('2030-06-15T11:00:00');

describe('isPendingAppointment', () => {
  it('cuenta una cita agendada que aún no empieza', () => {
    assert.equal(isPendingAppointment(futura('scheduled'), NOW), true);
  });

  it('cuenta una cita confirmada que aún no empieza', () => {
    assert.equal(isPendingAppointment(futura('confirmed'), NOW), true);
  });

  it('no cuenta los estados terminales', () => {
    for (const status of ['cancelled', 'no_show', 'completed']) {
      assert.equal(isPendingAppointment(futura(status), NOW), false, `falló con ${status}`);
    }
  });

  it('no cuenta una cita cuya hora de inicio ya pasó', () => {
    // Misma cita, pero "ahora" es una hora después del inicio: el cupo se libera
    // aunque el barbero nunca la haya confirmado.
    assert.equal(isPendingAppointment(futura('scheduled'), nowAt('2030-06-15T13:00:00')), false);
  });

  it('cuenta como pendiente si no hay hora utilizable (lado conservador)', () => {
    assert.equal(isPendingAppointment({ status: 'scheduled' }, NOW), true);
  });

  it('acepta registros en snake_case', () => {
    const row = { appointment_date: '2030-06-15', start_time: '12:00', status: 'scheduled' };
    assert.equal(isPendingAppointment(row, NOW), true);
  });
});

describe('countPendingAppointments', () => {
  it('cuenta solo las que ocupan cupo', () => {
    const rows = [
      futura('scheduled'),
      futura('confirmed'),
      futura('cancelled'),
      futura('completed'),
    ];
    assert.equal(countPendingAppointments(rows, NOW), 2);
  });

  it('devuelve 0 con entrada vacía o inválida', () => {
    assert.equal(countPendingAppointments([], NOW), 0);
    assert.equal(countPendingAppointments(null, NOW), 0);
  });
});

describe('assertUnderPendingLimit', () => {
  it('deja pasar por debajo del tope', () => {
    const rows = [futura(), futura()];
    assert.doesNotThrow(() => assertUnderPendingLimit(rows, NOW));
  });

  it('bloquea al alcanzar el tope', () => {
    const rows = [futura(), futura(), futura()];
    assert.throws(() => assertUnderPendingLimit(rows, NOW), (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, APPOINTMENT_LIMIT_REASON);
      assert.equal(err.details.limit, MAX_PENDING_APPOINTMENTS_PER_CLIENT);
      assert.equal(err.details.pending, 3);
      return true;
    });
  });

  it('no bloquea si las citas viejas ya pasaron de hora', () => {
    // Tres citas nunca confirmadas del pasado no deben dejar al cliente
    // bloqueado para siempre.
    const rows = [futura(), futura(), futura()];
    assert.doesNotThrow(() => assertUnderPendingLimit(rows, nowAt('2030-06-15T13:00:00')));
  });

  it('respeta un tope personalizado', () => {
    assert.throws(() => assertUnderPendingLimit([futura()], NOW, { limit: 1 }));
  });
});
