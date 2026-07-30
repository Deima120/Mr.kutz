import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  httpOtherIncomeError,
  incomeDateToYmd,
  sumCashOtherIncomes,
  toOtherIncomeDto,
} from './otherIncome.helpers.js';

describe('otherIncome.helpers — sumCashOtherIncomes', () => {
  it('suma solo vigentes con método isCash', () => {
    const sum = sumCashOtherIncomes([
      {
        amount: 30000,
        voidedAt: null,
        paymentMethod: { isCash: true, name: 'efectivo' },
      },
      {
        amount: 15000.5,
        voidedAt: null,
        paymentMethod: { isCash: true },
      },
      {
        amount: 99999,
        voidedAt: null,
        paymentMethod: { isCash: false, name: 'transferencia' },
      },
      {
        amount: 50000,
        voidedAt: new Date(),
        paymentMethod: { isCash: true },
      },
    ]);
    assert.equal(sum, 45000.5);
  });

  it('acepta isCash en el propio row', () => {
    assert.equal(sumCashOtherIncomes([{ amount: 1000, isCash: true }]), 1000);
    assert.equal(sumCashOtherIncomes([{ amount: 1000, isCash: false }]), 0);
  });

  it('lista vacía → 0', () => {
    assert.equal(sumCashOtherIncomes([]), 0);
    assert.equal(sumCashOtherIncomes(), 0);
  });
});

describe('otherIncome.helpers — dto y error', () => {
  it('incomeDateToYmd y toOtherIncomeDto', () => {
    assert.equal(incomeDateToYmd(new Date(Date.UTC(2026, 6, 29))), '2026-07-29');
    const dto = toOtherIncomeDto({
      id: 2,
      amount: '25000.00',
      incomeDate: new Date(Date.UTC(2026, 6, 29)),
      description: 'Alquiler silla',
      paymentMethodId: 1,
      cashRegisterId: 4,
      reference: 'OI-20260729-000001',
      notes: null,
      createdById: 1,
      createdAt: new Date(),
      voidedAt: null,
      voidReason: null,
      voidedById: null,
      paymentMethod: { name: 'efectivo', isCash: true },
      createdBy: { email: 'admin@test.com' },
    });
    assert.equal(dto.incomeDate, '2026-07-29');
    assert.equal(dto.amount, 25000);
    assert.equal(dto.paymentMethodIsCash, true);
    assert.equal(dto.createdByEmail, 'admin@test.com');
  });

  it('httpOtherIncomeError', () => {
    const err = httpOtherIncomeError('Sin caja.', 409, 'NO_OPEN_CASH_REGISTER');
    assert.equal(err.statusCode, 409);
    assert.equal(err.reason, 'NO_OPEN_CASH_REGISTER');
  });
});
