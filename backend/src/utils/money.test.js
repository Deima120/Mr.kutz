import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, formatMoneyOrDash, parseMoneyInput } from './money.js';

describe('backend formatMoney (COP es-CO)', () => {
  it('formatea miles y millones sin decimales', () => {
    assert.equal(formatMoney(0), '$0');
    assert.equal(formatMoney(1000), '$1.000');
    assert.equal(formatMoney(100000), '$100.000');
    assert.equal(formatMoney(1250000), '$1.250.000');
  });

  it('redondea centavos', () => {
    assert.equal(formatMoney(99.4), '$99');
    assert.equal(formatMoney(99.5), '$100');
  });

  it('parseMoneyInput entiende formato colombiano', () => {
    assert.equal(parseMoneyInput('1.000'), 1000);
    assert.equal(parseMoneyInput('100.000'), 100000);
  });

  it('formatMoneyOrDash', () => {
    assert.equal(formatMoneyOrDash(null), '—');
    assert.equal(formatMoneyOrDash(50000), '$50.000');
  });
});
