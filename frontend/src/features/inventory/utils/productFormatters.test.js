import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatProductUnit,
  getProductCostPrice,
  getProductMargin,
  isLowStock,
  isProductActive,
} from './productFormatters.js';

describe('formatters de inventario (UI)', () => {
  it('lee costo y margen en camelCase y snake_case', () => {
    assert.equal(getProductCostPrice({ costPrice: 10 }), 10);
    assert.equal(getProductCostPrice({ cost_price: 8.5 }), 8.5);
    assert.equal(getProductCostPrice({ costPrice: 0 }), null);
    assert.equal(getProductMargin({ retailPrice: 30, costPrice: 10 }), 20);
  });

  it('detecta stock bajo y estado activo', () => {
    assert.equal(isLowStock({ quantity: 2, minStock: 3 }), true);
    assert.equal(isLowStock({ quantity: 3, min_stock: 3 }), true);
    assert.equal(isLowStock({ quantity: 4, minStock: 3 }), false);
    assert.equal(isProductActive({ isActive: false }), false);
    assert.equal(isProductActive({ is_active: true }), true);
  });

  it('formatea unidades', () => {
    assert.equal(formatProductUnit('unit', 1), 'unidad');
    assert.equal(formatProductUnit('unit', 2), 'unidades');
    assert.equal(formatProductUnit('ml', 2), 'ml');
  });
});
