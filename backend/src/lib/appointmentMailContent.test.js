import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { __mailContentForTests } from '../lib/mailer.js';

const sample = {
  client_first_name: 'Ana',
  client_last_name: 'Pérez',
  barber_first_name: 'Luis',
  barber_last_name: 'García',
  service_name: 'Corte clásico',
  appointment_date: '2026-08-10',
  start_time: '10:30',
  cancel_reason: 'No puedo asistir',
};

describe('plantillas de correo de citas', () => {
  it('creación usa copy de agendada/registrada (no confirmada)', () => {
    const c = __mailContentForTests.buildAppointmentClientContent(sample, 'Mr. Kutz');
    assert.match(c.subject, /Cita agendada/);
    assert.match(c.text, /registrada/);
    assert.doesNotMatch(c.subject, /confirmada/i);
    assert.match(c.html, /Cita agendada/);
  });

  it('confirmada usa wording de confirmación', () => {
    const c = __mailContentForTests.buildAppointmentConfirmedClientContent(sample, 'Mr. Kutz');
    assert.match(c.subject, /Cita confirmada/);
    assert.match(c.text, /confirmada/);
  });

  it('cancelada incluye el motivo para cliente y barbero', () => {
    const client = __mailContentForTests.buildAppointmentCancelledClientContent(sample, 'Mr. Kutz');
    const barber = __mailContentForTests.buildAppointmentCancelledBarberContent(sample, 'Mr. Kutz');
    assert.match(client.text, /Motivo: No puedo asistir/);
    assert.match(client.html, /No puedo asistir/);
    assert.match(barber.text, /Motivo: No puedo asistir/);
    assert.match(barber.html, /No puedo asistir/);
  });
});
