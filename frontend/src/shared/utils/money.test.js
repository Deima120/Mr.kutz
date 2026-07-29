import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMoney,
  formatMoneyInputDigits,
  parseMoneyInput,
} from './money.js';

describe('parseMoneyInput', () => {
  it('acepta enteros planos', () => {
    assert.equal(parseMoneyInput('1500'), 1500);
    assert.equal(parseMoneyInput('100000'), 100000);
  });

  it('acepta miles colombianos con punto', () => {
    assert.equal(parseMoneyInput('1.000'), 1000);
    assert.equal(parseMoneyInput('100.000'), 100000);
    assert.equal(parseMoneyInput('1.250.000'), 1250000);
  });

  it('acepta decimales con coma', () => {
    assert.equal(parseMoneyInput('1.500,50'), 1500.5);
    assert.equal(parseMoneyInput('1500,5'), 1500.5);
  });
});

describe('formatMoney', () => {
  it('formatea con punto de miles y sin decimales forzados', () => {
    assert.equal(formatMoney(1000), '$1.000');
    assert.equal(formatMoney(100000), '$100.000');
    assert.equal(formatMoney(1250.7), '$1.251');
  });
});

describe('formatMoneyInputDigits', () => {
  it('inserta puntos de miles al escribir', () => {
    assert.equal(formatMoneyInputDigits('1000'), '1.000');
    assert.equal(formatMoneyInputDigits('100000'), '100.000');
    assert.equal(formatMoneyInputDigits('1.000'), '1.000');
  });
});
