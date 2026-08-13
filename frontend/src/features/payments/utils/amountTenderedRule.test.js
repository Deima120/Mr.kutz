import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkAmountTendered,
  TENDERED_BELOW_CASH,
  TENDERED_WITHOUT_CASH,
} from './amountTenderedRule.js';

test('recibido menor que el efectivo a pagar es invalido', () => {
  const r = checkAmountTendered({ amountTendered: '40000', cashAmount: 60000 });
  assert.equal(r.valid, false);
  assert.equal(r.message, TENDERED_BELOW_CASH);
});

test('recibido exacto o mayor es valido', () => {
  assert.equal(checkAmountTendered({ amountTendered: '60000', cashAmount: 60000 }).valid, true);
  assert.equal(checkAmountTendered({ amountTendered: '100000', cashAmount: 60000 }).valid, true);
});

test('vacio es valido: se asume pago exacto', () => {
  for (const v of ['', '   ', null, undefined]) {
    assert.equal(
      checkAmountTendered({ amountTendered: v, cashAmount: 60000 }).valid,
      true,
      JSON.stringify(v)
    );
  }
});

test('acepta el formato con separadores de miles que produce el input', () => {
  assert.equal(checkAmountTendered({ amountTendered: '60.000', cashAmount: 60000 }).valid, true);
  assert.equal(checkAmountTendered({ amountTendered: '40.000', cashAmount: 60000 }).valid, false);
  assert.equal(checkAmountTendered({ amountTendered: '$ 100.000', cashAmount: 60000 }).valid, true);
});

test('sin porcion en efectivo, indicar recibido es invalido', () => {
  const r = checkAmountTendered({ amountTendered: '10000', cashAmount: 0 });
  assert.equal(r.valid, false);
  assert.equal(r.message, TENDERED_WITHOUT_CASH);
});

test('sin efectivo y sin recibido no hay error', () => {
  assert.equal(checkAmountTendered({ amountTendered: '', cashAmount: 0 }).valid, true);
});

test('un recibido no numerico es invalido', () => {
  for (const v of ['abc', '0', '-100']) {
    assert.equal(
      checkAmountTendered({ amountTendered: v, cashAmount: 60000 }).valid,
      false,
      v
    );
  }
});

test('diferencia de un peso: 59.999 no alcanza para 60.000', () => {
  assert.equal(checkAmountTendered({ amountTendered: '59999', cashAmount: 60000 }).valid, false);
  assert.equal(checkAmountTendered({ amountTendered: '60001', cashAmount: 60000 }).valid, true);
});

test('no revienta sin argumentos', () => {
  assert.equal(checkAmountTendered().valid, true);
  assert.equal(checkAmountTendered({}).valid, true);
});
