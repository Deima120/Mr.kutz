import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertVoidReason, normalizeOptionalAppointmentId } from './payment.rules.js';

describe('normalizeOptionalAppointmentId', () => {
  it('trata vacío como null (pago sin cita)', () => {
    assert.equal(normalizeOptionalAppointmentId(null), null);
    assert.equal(normalizeOptionalAppointmentId(''), null);
    assert.equal(normalizeOptionalAppointmentId(undefined), null);
  });

  it('acepta ids enteros positivos', () => {
    assert.equal(normalizeOptionalAppointmentId(12), 12);
    assert.equal(normalizeOptionalAppointmentId('7'), 7);
  });

  it('rechaza ids inválidos sin inventar valores', () => {
    assert.throws(() => normalizeOptionalAppointmentId(0), /cita válida/);
    assert.throws(() => normalizeOptionalAppointmentId(-1), /cita válida/);
    assert.throws(() => normalizeOptionalAppointmentId('abc'), /cita válida/);
  });
});

describe('assertVoidReason', () => {
  it('exige motivo no vacío', () => {
    assert.throws(() => assertVoidReason(''), /motivo de anulación/);
    assert.throws(() => assertVoidReason('   '), /motivo de anulación/);
    assert.throws(() => assertVoidReason(null), /motivo de anulación/);
  });

  it('devuelve el motivo recortado', () => {
    assert.equal(assertVoidReason('  error de registro  '), 'error de registro');
    assert.equal(assertVoidReason('x'.repeat(600)).length, 500);
  });
});
