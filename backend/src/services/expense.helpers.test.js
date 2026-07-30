import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateExpenseTotals,
  expenseDateToYmd,
  httpExpenseError,
  toExpenseCategoryDto,
  toExpenseDto,
} from './expense.helpers.js';

describe('expense.helpers — fechas y errores', () => {
  it('expenseDateToYmd normaliza Date UTC date-only', () => {
    assert.equal(expenseDateToYmd(new Date(Date.UTC(2026, 6, 29))), '2026-07-29');
    assert.equal(expenseDateToYmd('2026-07-28'), '2026-07-28');
  });

  it('httpExpenseError lleva statusCode y reason', () => {
    const err = httpExpenseError('Categoría no encontrada.', 404, 'EXPENSE_CATEGORY_NOT_FOUND');
    assert.equal(err.statusCode, 404);
    assert.equal(err.reason, 'EXPENSE_CATEGORY_NOT_FOUND');
    assert.match(err.message, /Categoría/);
  });
});

describe('aggregateExpenseTotals — por categoría en centavos', () => {
  it('suma solo vigentes y agrupa por categoría', () => {
    const totals = aggregateExpenseTotals([
      {
        id: 1,
        categoryId: 1,
        amount: 50000.5,
        voidedAt: null,
        category: { id: 1, name: 'Arriendo' },
      },
      {
        id: 2,
        categoryId: 1,
        amount: 10000.5,
        voidedAt: null,
        category: { id: 1, name: 'Arriendo' },
      },
      {
        id: 3,
        categoryId: 2,
        amount: 20000,
        voidedAt: null,
        category: { id: 2, name: 'Insumos' },
      },
      {
        id: 4,
        categoryId: 2,
        amount: 99999,
        voidedAt: new Date(),
        category: { id: 2, name: 'Insumos' },
      },
    ]);

    assert.equal(totals.expenseCount, 3);
    assert.equal(totals.totalAmount, 80001);
    const arriendo = totals.byCategory.find((c) => c.categoryId === 1);
    const insumos = totals.byCategory.find((c) => c.categoryId === 2);
    assert.equal(arriendo.amount, 60001);
    assert.equal(arriendo.count, 2);
    assert.equal(arriendo.categoryName, 'Arriendo');
    assert.equal(insumos.amount, 20000);
    assert.equal(insumos.count, 1);
  });

  it('evita drift de float con montos .01', () => {
    const totals = aggregateExpenseTotals([
      { categoryId: 1, amount: 0.1, voidedAt: null, category: { name: 'Otros' } },
      { categoryId: 1, amount: 0.2, voidedAt: null, category: { name: 'Otros' } },
    ]);
    assert.equal(totals.totalAmount, 0.3);
  });
});

describe('toExpenseDto / toExpenseCategoryDto', () => {
  it('mapea DTO de gasto', () => {
    const dto = toExpenseDto({
      id: 9,
      categoryId: 3,
      amount: '15000.00',
      expenseDate: new Date(Date.UTC(2026, 6, 29)),
      notes: 'Agua',
      attachmentUrl: null,
      reference: 'EXP-20260729-000001',
      createdById: 1,
      createdAt: new Date('2026-07-29T12:00:00Z'),
      voidedAt: null,
      voidReason: null,
      voidedById: null,
      category: { name: 'Servicios públicos' },
      createdBy: { email: 'admin@test.com' },
    });
    assert.equal(dto.expenseDate, '2026-07-29');
    assert.equal(dto.amount, 15000);
    assert.equal(dto.categoryName, 'Servicios públicos');
    assert.equal(dto.createdByEmail, 'admin@test.com');
  });

  it('mapea DTO de categoría', () => {
    const dto = toExpenseCategoryDto({
      id: 1,
      name: 'Arriendo',
      isActive: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal(dto.name, 'Arriendo');
    assert.equal(dto.isActive, true);
    assert.equal(dto.sortOrder, 1);
  });
});
