import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  statusTransitionNotification,
  validateCancelReason,
} from './appointmentNotificationRules.js';

describe('validateCancelReason', () => {
  it('exige motivo no vacío', () => {
    assert.equal(validateCancelReason('').ok, false);
    assert.equal(validateCancelReason('   ').ok, false);
  });

  it('acepta motivo válido y recorta espacios', () => {
    const r = validateCancelReason('  No puedo asistir  ');
    assert.equal(r.ok, true);
    assert.equal(r.reason, 'No puedo asistir');
  });

  it('rechaza motivos demasiado largos', () => {
    const r = validateCancelReason('x'.repeat(501));
    assert.equal(r.ok, false);
  });
});

describe('statusTransitionNotification', () => {
  it('dispara solo en transición real a confirmed/cancelled/completed', () => {
    assert.equal(statusTransitionNotification('scheduled', 'confirmed'), 'confirmed');
    assert.equal(statusTransitionNotification('confirmed', 'confirmed'), null);
    assert.equal(statusTransitionNotification('scheduled', 'cancelled'), 'cancelled');
    assert.equal(statusTransitionNotification('cancelled', 'cancelled'), null);
    assert.equal(statusTransitionNotification('in_progress', 'completed'), 'completed');
    assert.equal(statusTransitionNotification('scheduled', 'scheduled'), null);
  });
});
