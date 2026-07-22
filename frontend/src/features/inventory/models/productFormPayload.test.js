import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildProductPayload,
  createEmptyProductForm,
  mapProductToForm,
  proposedUnitCostFromProduct,
  sanitizeImportRows,
} from './productFormPayload.js';

describe('payload de formulario de producto (UI)', () => {
  it('nunca incluye costPrice en el payload de API', () => {
    const payload = buildProductPayload(
      createEmptyProductForm({
        name: 'Gel',
        retailPrice: '25',
        costPrice: '10',
        categoryId: '3',
        description: '  Fijador  ',
      })
    );
    assert.equal(payload.name, 'Gel');
    assert.equal(payload.retailPrice, 25);
    assert.equal(payload.categoryId, 3);
    assert.equal(payload.description, 'Fijador');
    assert.equal('costPrice' in payload, false);
  });

  it('en edición incluye isActive y mapea unidad existente', () => {
    const form = mapProductToForm({
      name: 'Cera',
      unit: 'ml',
      is_active: false,
      min_stock: 2,
      retail_price: 15,
      cost_price: 7,
    });
    assert.equal(form.unit, 'ml');
    assert.equal(form.isActive, false);
    assert.equal(form.costPrice, '7');

    const payload = buildProductPayload(form, { isEdit: true });
    assert.equal(payload.isActive, false);
    assert.equal(payload.unit, 'ml');
    assert.equal('costPrice' in payload, false);
  });

  it('sanitiza filas de importación sin costo y propone costo de compra', () => {
    const rows = sanitizeImportRows([
      { name: 'A', costPrice: 5, cost_price: 5, precio_costo: 5, retailPrice: 10 },
    ]);
    assert.equal(rows[0].name, 'A');
    assert.equal(rows[0].retailPrice, 10);
    assert.equal('costPrice' in rows[0], false);
    assert.equal('cost_price' in rows[0], false);
    assert.equal(proposedUnitCostFromProduct({ costPrice: 12 }), '12');
    assert.equal(proposedUnitCostFromProduct({ costPrice: 0 }), '');
  });
});
