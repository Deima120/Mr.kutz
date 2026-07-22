import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeSupplierName } from './supplier.service.js';

describe('normalizeSupplierName', () => {
  it('normaliza mayúsculas, espacios y caracteres Unicode', () => {
    assert.equal(normalizeSupplierName('  DISTRIBUCIONES   ÁGUILA  '), 'distribuciones águila');
    assert.equal(normalizeSupplierName('ＡＣＭＥ'), 'acme');
  });
});
