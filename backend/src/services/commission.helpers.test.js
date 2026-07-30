import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_COMMISSION_PERCENT,
  computeCommissionAmount,
  resolveCommissionPercent,
} from './commission.helpers.js';

describe('resolveCommissionPercent', () => {
  it('prioriza el porcentaje del barbero', () => {
    assert.equal(resolveCommissionPercent(35, 40), 35);
    assert.equal(resolveCommissionPercent('42.5', 40), 42.5);
  });

  it('usa el default del negocio si el barbero no tiene porcentaje', () => {
    assert.equal(resolveCommissionPercent(null, 45), 45);
    assert.equal(resolveCommissionPercent(undefined, '50'), 50);
    assert.equal(resolveCommissionPercent('', 38), 38);
  });

  it('cae a 40 si no hay barbero ni default válido', () => {
    assert.equal(resolveCommissionPercent(null, null), DEFAULT_COMMISSION_PERCENT);
    assert.equal(resolveCommissionPercent(undefined, undefined), 40);
    assert.equal(resolveCommissionPercent(null, 'x'), 40);
  });
});

describe('computeCommissionAmount — centavos exactos', () => {
  it('calcula 40% de 100000 = 40000', () => {
    assert.equal(computeCommissionAmount(100000, 40), 40000);
  });

  it('redondea a centavo (half-up vía Math.round)', () => {
    // 33.33% de 100.00 → 3333 cents * 33.33 / 100 = 1110.888… → 1111 cents → 11.11
    assert.equal(computeCommissionAmount(100, 33.33), 33.33);
    // 10.01 * 40% → 1001 * 40 / 100 = 400.4 → 400 cents → 4.00
    assert.equal(computeCommissionAmount(10.01, 40), 4);
    // 10.02 * 40% → 1002 * 40 / 100 = 400.8 → 401 cents → 4.01
    assert.equal(computeCommissionAmount(10.02, 40), 4.01);
  });

  it('acepta Decimal-like / string', () => {
    assert.equal(computeCommissionAmount('25000', '50'), 12500);
  });

  it('0% o monto 0 → 0', () => {
    assert.equal(computeCommissionAmount(50000, 0), 0);
    assert.equal(computeCommissionAmount(0, 40), 0);
  });
});
