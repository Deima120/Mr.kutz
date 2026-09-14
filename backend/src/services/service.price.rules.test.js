import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertServicePrice } from './service.rules.js';

describe('assertServicePrice', () => {
  it('acepta precios enteros positivos', () => {
    assert.equal(assertServicePrice(1), 1);
    assert.equal(assertServicePrice('25000'), 25000);
  });

  it('rechaza 0, negativos e inválidos', () => {
    assert.throws(() => assertServicePrice(0), /mayor a 0/);
    assert.throws(() => assertServicePrice(-1), /mayor a 0/);
    assert.throws(() => assertServicePrice('abc'), /mayor a 0/);
  });

  it('rechaza precios con decimales (la moneda del negocio no usa centavos)', () => {
    assert.throws(() => assertServicePrice('25.5'), /entero/);
    assert.throws(() => assertServicePrice(25.01), /entero/);
  });
});
