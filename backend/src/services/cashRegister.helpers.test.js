import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateCashRegisterSummary,
  businessDateToYmd,
  daysOpenRelativeToToday,
  httpCashError,
  isStaleOpenRegister,
  mapUnpaidCompletedAppointments,
  toCashRegisterDto,
} from './cashRegister.helpers.js';

describe('cashRegister.helpers — fecha y caja vieja', () => {
  it('businessDateToYmd normaliza Date UTC date-only', () => {
    assert.equal(businessDateToYmd(new Date(Date.UTC(2026, 6, 28))), '2026-07-28');
    assert.equal(businessDateToYmd('2026-07-29'), '2026-07-29');
  });

  it('isStaleOpenRegister: OPEN de otro día vs hoy', () => {
    const open = {
      status: 'OPEN',
      businessDate: new Date(Date.UTC(2026, 6, 27)),
    };
    assert.equal(isStaleOpenRegister(open, '2026-07-29'), true);
    assert.equal(isStaleOpenRegister(open, '2026-07-27'), false);
    assert.equal(
      isStaleOpenRegister({ ...open, status: 'CLOSED' }, '2026-07-29'),
      false
    );
  });

  it('daysOpenRelativeToToday cuenta días civiles', () => {
    assert.equal(
      daysOpenRelativeToToday(new Date(Date.UTC(2026, 6, 27)), '2026-07-29'),
      2
    );
    assert.equal(
      daysOpenRelativeToToday(new Date(Date.UTC(2026, 6, 29)), '2026-07-29'),
      0
    );
  });

  it('toCashRegisterDto expone staleWarning con fecha', () => {
    const dto = toCashRegisterDto(
      {
        id: 3,
        businessDate: new Date(Date.UTC(2026, 6, 27)),
        openingAmount: 100000,
        openedById: 1,
        openedAt: new Date(),
        status: 'OPEN',
        closedById: null,
        closedAt: null,
        countedCash: null,
        notes: null,
        openedBy: { email: 'admin@test.com' },
      },
      { todayYmd: '2026-07-29' }
    );
    assert.equal(dto.isStaleOpen, true);
    assert.equal(dto.daysOpen, 2);
    assert.match(dto.staleWarning, /2026-07-27/);
    assert.match(dto.staleWarning, /2 días/);
  });
});

describe('aggregateCashRegisterSummary — por PaymentMethodSplit', () => {
  it('reparte mixto por split isCash y calcula expectedCash', () => {
    const summary = aggregateCashRegisterSummary(
      [
        {
          id: 10,
          amount: 140000,
          methodSplits: [
            {
              paymentMethodId: 1,
              amount: 50000,
              paymentMethod: { id: 1, name: 'efectivo', isCash: true },
            },
            {
              paymentMethodId: 3,
              amount: 90000,
              paymentMethod: { id: 3, name: 'tarjeta', isCash: false },
            },
          ],
        },
        {
          id: 11,
          amount: 20000,
          methodSplits: [
            {
              paymentMethodId: 1,
              amount: 20000,
              paymentMethod: { id: 1, name: 'efectivo', isCash: true },
            },
          ],
        },
      ],
      100000
    );

    assert.equal(summary.paymentCount, 2);
    assert.equal(summary.totalAmount, 160000);
    assert.equal(summary.cashCollected, 70000);
    assert.equal(summary.cashOtherIncomes, 0);
    assert.equal(summary.expectedCash, 170000); // base 100k + cash 70k
    const cash = summary.byMethod.find((m) => m.paymentMethodId === 1);
    const card = summary.byMethod.find((m) => m.paymentMethodId === 3);
    assert.equal(cash.amount, 70000);
    assert.equal(card.amount, 90000);
    assert.equal(cash.isCash, true);
    assert.equal(card.isCash, false);
  });

  it('suma otros ingresos en efectivo al expectedCash', () => {
    const summary = aggregateCashRegisterSummary(
      [
        {
          id: 1,
          amount: 20000,
          methodSplits: [
            {
              paymentMethodId: 1,
              amount: 20000,
              paymentMethod: { id: 1, name: 'efectivo', isCash: true },
            },
          ],
        },
      ],
      50000,
      [
        { amount: 15000, voidedAt: null, paymentMethod: { isCash: true } },
        { amount: 8000, voidedAt: null, paymentMethod: { isCash: false } },
        { amount: 9000, voidedAt: new Date(), paymentMethod: { isCash: true } },
      ]
    );
    assert.equal(summary.cashCollected, 20000);
    assert.equal(summary.cashOtherIncomes, 15000);
    assert.equal(summary.expectedCash, 85000); // 50k + 20k + 15k
  });

  it('no usa paymentMethodId de cabecera (solo splits)', () => {
    const summary = aggregateCashRegisterSummary(
      [
        {
          id: 1,
          amount: 100,
          paymentMethodId: 99,
          methodSplits: [
            {
              paymentMethodId: 2,
              amount: 100,
              paymentMethod: { id: 2, name: 'transferencia', isCash: false },
            },
          ],
        },
      ],
      0
    );
    assert.equal(summary.byMethod.length, 1);
    assert.equal(summary.byMethod[0].paymentMethodId, 2);
    assert.equal(summary.expectedCash, 0);
  });
});

describe('mapUnpaidCompletedAppointments + httpCashError', () => {
  it('mapea pendientes de cobro', () => {
    const list = mapUnpaidCompletedAppointments([
      {
        id: 5,
        appointmentDate: new Date(Date.UTC(2026, 6, 29)),
        startTime: '10:00:00',
        client: { firstName: 'Ana', lastName: 'López' },
        service: { name: 'Corte' },
      },
    ]);
    assert.equal(list[0].id, 5);
    assert.equal(list[0].clientName, 'Ana López');
    assert.equal(list[0].serviceName, 'Corte');
    assert.equal(list[0].appointmentDate, '2026-07-29');
  });

  it('httpCashError lleva reason y details (caja vieja)', () => {
    const err = httpCashError(
      'Ya hay una caja abierta del 2026-07-27. Ciérrala antes de abrir una nueva.',
      409,
      'CASH_REGISTER_ALREADY_OPEN',
      { businessDate: '2026-07-27', openRegisterId: 2 }
    );
    assert.equal(err.statusCode, 409);
    assert.equal(err.reason, 'CASH_REGISTER_ALREADY_OPEN');
    assert.equal(err.details.businessDate, '2026-07-27');
    assert.match(err.message, /2026-07-27/);
  });
});
