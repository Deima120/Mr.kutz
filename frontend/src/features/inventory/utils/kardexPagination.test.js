import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KARDEX_DEFAULT_PAGE_SIZE,
  clampKardexPage,
  clampKardexPageSize,
  kardexOffset,
  kardexTotalPages,
} from './kardexPagination.js';

describe('paginación de kardex (UI)', () => {
  it('clampa el tamaño de página', () => {
    assert.equal(clampKardexPageSize(undefined), KARDEX_DEFAULT_PAGE_SIZE);
    assert.equal(clampKardexPageSize(0), KARDEX_DEFAULT_PAGE_SIZE);
    assert.equal(clampKardexPageSize(20), 20);
    assert.equal(clampKardexPageSize(500), 100);
  });

  it('calcula offset y total de páginas', () => {
    assert.equal(kardexOffset(1, 20), 0);
    assert.equal(kardexOffset(3, 20), 40);
    assert.equal(kardexOffset(0, 20), 0);
    assert.equal(kardexTotalPages(0, 20), 1);
    assert.equal(kardexTotalPages(41, 20), 3);
  });

  it('ajusta la página cuando el total se reduce', () => {
    assert.equal(clampKardexPage(9, 25, 10), 3);
    assert.equal(clampKardexPage(1, 25, 10), 1);
  });
});
