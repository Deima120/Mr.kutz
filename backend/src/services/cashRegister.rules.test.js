/**
 * Reglas de caja con harness mock (sin BD): open bloqueado, close con pendientes, summary.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  aggregateCashRegisterSummary,
  httpCashError,
  mapUnpaidCompletedAppointments,
  toCashRegisterDto,
} from './cashRegister.helpers.js';

function money(n) {
  return new Prisma.Decimal(Number(n).toFixed(2));
}

/**
 * Simula la lógica de open/close del service (misma decisión de negocio).
 */
function assertCanOpen({ existingOpen, sameDay, todayYmd }) {
  if (existingOpen) {
    const openYmd = toCashRegisterDto(existingOpen, { todayYmd }).businessDate;
    throw httpCashError(
      `Ya hay una caja abierta del ${openYmd}. Ciérrala antes de abrir una nueva.`,
      409,
      'CASH_REGISTER_ALREADY_OPEN',
      { openRegisterId: existingOpen.id, businessDate: openYmd }
    );
  }
  if (sameDay) {
    throw httpCashError(
      `Ya existe una caja para el día ${todayYmd}.`,
      409,
      'CASH_REGISTER_DAY_EXISTS',
      { businessDate: todayYmd }
    );
  }
}

function assertCanClose({ unpaidAppointments }) {
  const unpaid = mapUnpaidCompletedAppointments(unpaidAppointments);
  if (unpaid.length > 0) {
    throw httpCashError(
      `No se puede cerrar: hay ${unpaid.length} cita(s) completada(s) sin cobro.`,
      409,
      'UNPAID_COMPLETED_APPOINTMENTS',
      { unpaidAppointments: unpaid }
    );
  }
}

describe('reglas open/close caja', () => {
  it('no permite abrir si hay OPEN de un día anterior (mensaje con fecha)', () => {
    assert.throws(
      () =>
        assertCanOpen({
          todayYmd: '2026-07-29',
          existingOpen: {
            id: 7,
            status: 'OPEN',
            businessDate: new Date(Date.UTC(2026, 6, 27)),
            openingAmount: money(50000),
            openedById: 1,
            openedAt: new Date(),
          },
          sameDay: null,
        }),
      (err) => {
        assert.equal(err.reason, 'CASH_REGISTER_ALREADY_OPEN');
        assert.equal(err.details.businessDate, '2026-07-27');
        assert.match(err.message, /2026-07-27/);
        return true;
      }
    );
  });

  it('no permite dos cajas el mismo día (aunque la anterior esté CLOSED)', () => {
    assert.throws(
      () =>
        assertCanOpen({
          todayYmd: '2026-07-29',
          existingOpen: null,
          sameDay: { id: 1, status: 'CLOSED', businessDate: new Date(Date.UTC(2026, 6, 29)) },
        }),
      (err) => err.reason === 'CASH_REGISTER_DAY_EXISTS'
    );
  });

  it('permite abrir si no hay OPEN ni fila del día', () => {
    assert.doesNotThrow(() =>
      assertCanOpen({
        todayYmd: '2026-07-29',
        existingOpen: null,
        sameDay: null,
      })
    );
  });

  it('no permite cerrar con citas completed sin cobro', () => {
    assert.throws(
      () =>
        assertCanClose({
          unpaidAppointments: [
            {
              id: 9,
              appointmentDate: new Date(Date.UTC(2026, 6, 29)),
              startTime: '11:00',
              client: { firstName: 'Luis', lastName: 'Pérez' },
              service: { name: 'Barba' },
            },
          ],
        }),
      (err) => {
        assert.equal(err.reason, 'UNPAID_COMPLETED_APPOINTMENTS');
        assert.equal(err.details.unpaidAppointments.length, 1);
        assert.equal(err.details.unpaidAppointments[0].clientName, 'Luis Pérez');
        return true;
      }
    );
  });

  it('permite cerrar si no hay pendientes', () => {
    assert.doesNotThrow(() => assertCanClose({ unpaidAppointments: [] }));
  });

  it('resumen de cierre cuadra con suma real de splits (mixto)', () => {
    const opening = 80000;
    const payments = [
      {
        id: 1,
        methodSplits: [
          { paymentMethodId: 1, amount: 30000, paymentMethod: { id: 1, name: 'efectivo', isCash: true } },
          { paymentMethodId: 2, amount: 70000, paymentMethod: { id: 2, name: 'transferencia', isCash: false } },
        ],
      },
      {
        id: 2,
        methodSplits: [
          { paymentMethodId: 1, amount: 10000, paymentMethod: { id: 1, name: 'efectivo', isCash: true } },
        ],
      },
    ];
    const summary = aggregateCashRegisterSummary(payments, opening);
    assert.equal(summary.totalAmount, 110000);
    assert.equal(summary.expectedCash, 120000);
    assert.equal(
      summary.byMethod.reduce((s, m) => s + m.amount, 0),
      summary.totalAmount
    );
  });
});
