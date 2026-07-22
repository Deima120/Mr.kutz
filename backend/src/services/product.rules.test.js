import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertNoManualCost,
  assertProductCanDeactivate,
  parsePositiveOptionalMoney,
} from './product.rules.js';

describe('reglas de escritura de producto', () => {
  it('acepta importes vacíos o positivos y rechaza cero y negativos', () => {
    assert.equal(parsePositiveOptionalMoney('', 'El precio'), null);
    assert.equal(parsePositiveOptionalMoney(null, 'El precio'), null);
    assert.equal(parsePositiveOptionalMoney('12.345', 'El precio'), 12.35);
    assert.throws(() => parsePositiveOptionalMoney(0, 'El precio'), /mayor que cero/);
    assert.throws(() => parsePositiveOptionalMoney(-1, 'El precio'), /mayor que cero/);
  });

  it('impide definir o limpiar manualmente el costo promedio', () => {
    assert.doesNotThrow(() => assertNoManualCost({ retailPrice: 20 }));
    assert.throws(() => assertNoManualCost({ costPrice: 10 }), /recepciones/);
    assert.throws(() => assertNoManualCost({ costPrice: null }), /recepciones/);
  });

  it('solo permite archivar sin stock ni órdenes abiertas', () => {
    assert.doesNotThrow(() => assertProductCanDeactivate({ quantity: 0, openOrderCount: 0 }));
    assert.throws(
      () => assertProductCanDeactivate({ quantity: 1, openOrderCount: 0 }),
      /stock activo/
    );
    assert.throws(
      () => assertProductCanDeactivate({ quantity: 0, openOrderCount: 1 }),
      /órdenes abiertas/
    );
  });
});
