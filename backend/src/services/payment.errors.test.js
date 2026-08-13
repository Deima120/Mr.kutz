import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isActiveAppointmentCollision,
  isFolioCollision,
  p2002Target,
  ACTIVE_APPOINTMENT_UIDX,
} from './payment.errors.js';

const p2002 = (target) => ({ code: 'P2002', meta: { target } });

test('reconoce la colision real de cita ya cobrada', () => {
  const err = p2002(ACTIVE_APPOINTMENT_UIDX);
  assert.equal(isActiveAppointmentCollision(err), true);
  assert.equal(isFolioCollision(err), false);
});

test('la carrera de folio NO se confunde con cita ya cobrada', () => {
  // Este era el bug: se reportaba "esta cita ya tiene un cobro activo" y
  // el operador no reintentaba, perdiendo la venta.
  for (const target of [
    'document_sequences_doc_type_period_key_key',
    ['docType', 'periodKey'],
    'Payment_reference_key',
    ['reference'],
  ]) {
    const err = p2002(target);
    assert.equal(isFolioCollision(err), true, String(target));
    assert.equal(isActiveAppointmentCollision(err), false, String(target));
  }
});

test('meta.target funciona como string y como array', () => {
  assert.equal(p2002Target(p2002('abc')), 'abc');
  assert.equal(p2002Target(p2002(['a', 'b'])), 'a,b');
});

test('un P2002 desconocido no se clasifica como ninguno de los dos', () => {
  const err = p2002('payment_method_splits_payment_id_payment_method_id_key');
  assert.equal(isActiveAppointmentCollision(err), false);
  assert.equal(isFolioCollision(err), false);
});

test('no revienta si falta meta o target', () => {
  for (const err of [undefined, null, {}, { meta: {} }, { meta: { target: null } }]) {
    assert.equal(isActiveAppointmentCollision(err), false);
    assert.equal(isFolioCollision(err), false);
  }
});
