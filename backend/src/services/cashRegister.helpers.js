/**
 * Helpers de caja (sin I/O). Resumen por PaymentMethodSplit + meta de caja vieja.
 */

import {
  extractAppointmentDateYmd,
  getColombiaTodayYmd,
  ymdToUtcDate,
} from '../utils/colombiaTime.js';
import { moneyToNumber } from './payment.lines.helpers.js';
import { sumCashOtherIncomes } from './otherIncome.helpers.js';

export function httpCashError(message, statusCode = 400, reason = null, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  if (details != null) err.details = details;
  return err;
}

/** YYYY-MM-DD desde Date @db.Date o string. */
export function businessDateToYmd(value) {
  return extractAppointmentDateYmd(value) || '';
}

/**
 * Días civiles entre businessDate y hoy Colombia (0 = mismo día).
 */
export function daysOpenRelativeToToday(businessDate, todayYmd = getColombiaTodayYmd()) {
  const from = businessDateToYmd(businessDate);
  const to = String(todayYmd || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 0;
  const ms = ymdToUtcDate(to).getTime() - ymdToUtcDate(from).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function isStaleOpenRegister(register, todayYmd = getColombiaTodayYmd()) {
  if (!register || register.status !== 'OPEN') return false;
  const ymd = businessDateToYmd(register.businessDate);
  return Boolean(ymd && ymd !== todayYmd);
}

/**
 * Agrega montos por método desde payments con methodSplits (pagos vigentes).
 * Efectivo esperado = openingAmount + Σ splits isCash + Σ otros ingresos efectivo.
 *
 * @param {Array<{ id: number, amount: unknown, methodSplits?: Array<object> }>} payments
 * @param {unknown} openingAmount
 * @param {Array<object>} [otherIncomes] otros ingresos de la caja (se ignora voidedAt)
 */
export function aggregateCashRegisterSummary(payments = [], openingAmount = 0, otherIncomes = []) {
  const byMethod = new Map();
  let totalFromSplits = 0;
  let cashFromSplits = 0;
  const paymentIds = new Set();

  for (const payment of payments) {
    paymentIds.add(payment.id);
    const splits = Array.isArray(payment.methodSplits) ? payment.methodSplits : [];
    for (const split of splits) {
      const methodId = split.paymentMethodId ?? split.paymentMethod?.id;
      if (methodId == null) continue;
      const amount = moneyToNumber(split.amount);
      const cents = Math.round(amount * 100);
      totalFromSplits += cents;
      const isCash = Boolean(split.paymentMethod?.isCash ?? split.isCash);
      if (isCash) cashFromSplits += cents;

      const key = String(methodId);
      const prev = byMethod.get(key) || {
        paymentMethodId: Number(methodId),
        paymentMethodName: split.paymentMethod?.name ?? split.paymentMethodName ?? null,
        isCash,
        amount: 0,
        paymentCount: 0,
        _paymentIds: new Set(),
      };
      prev.amount += cents;
      prev._paymentIds.add(payment.id);
      if (split.paymentMethod?.name) prev.paymentMethodName = split.paymentMethod.name;
      prev.isCash = isCash;
      byMethod.set(key, prev);
    }
  }

  const byMethodList = [...byMethod.values()]
    .map((row) => ({
      paymentMethodId: row.paymentMethodId,
      paymentMethodName: row.paymentMethodName,
      isCash: row.isCash,
      amount: row.amount / 100,
      paymentCount: row._paymentIds.size,
    }))
    .sort((a, b) => a.paymentMethodId - b.paymentMethodId);

  const opening = moneyToNumber(openingAmount);
  const cashOtherIncomes = sumCashOtherIncomes(otherIncomes);
  const expectedCash =
    Math.round(opening * 100 + cashFromSplits + Math.round(cashOtherIncomes * 100)) / 100;

  return {
    paymentCount: paymentIds.size,
    totalAmount: totalFromSplits / 100,
    cashCollected: cashFromSplits / 100,
    cashOtherIncomes,
    expectedCash,
    byMethod: byMethodList,
  };
}

/**
 * Resumen ligero para GET /current (banner / polling).
 * Misma agregación que el cierre; sin sections de reportes.
 *
 * @param {ReturnType<typeof aggregateCashRegisterSummary>|null|undefined} aggregated
 */
export function toLiveSummaryDto(aggregated) {
  if (!aggregated) return null;
  return {
    paymentCount: aggregated.paymentCount,
    totalAmount: aggregated.totalAmount,
    cashCollected: aggregated.cashCollected,
    cashOtherIncomes: aggregated.cashOtherIncomes,
    expectedCash: aggregated.expectedCash,
    byMethod: Array.isArray(aggregated.byMethod) ? aggregated.byMethod : [],
  };
}

/**
 * Mapear citas completed sin cobro activo a DTO de pendiente.
 */
export function mapUnpaidCompletedAppointments(appointments = []) {
  return appointments.map((a) => ({
    id: a.id,
    clientName: `${a.client?.firstName || ''} ${a.client?.lastName || ''}`.trim() || '—',
    serviceName: a.service?.name || 'Servicio',
    appointmentDate: businessDateToYmd(a.appointmentDate),
    startTime: a.startTime,
  }));
}

export function toCashRegisterDto(register, { todayYmd = getColombiaTodayYmd() } = {}) {
  if (!register) return null;
  const businessDate = businessDateToYmd(register.businessDate);
  const staleOpen = isStaleOpenRegister(register, todayYmd);
  const daysOpen = register.status === 'OPEN' ? daysOpenRelativeToToday(register.businessDate, todayYmd) : 0;

  return {
    id: register.id,
    businessDate,
    openingAmount: moneyToNumber(register.openingAmount),
    openedById: register.openedById,
    openedAt: register.openedAt,
    status: register.status,
    closedById: register.closedById ?? null,
    closedAt: register.closedAt ?? null,
    countedCash:
      register.countedCash != null ? moneyToNumber(register.countedCash) : null,
    notes: register.notes ?? null,
    openedByEmail: register.openedBy?.email ?? null,
    closedByEmail: register.closedBy?.email ?? null,
    isStaleOpen: staleOpen,
    daysOpen,
    staleWarning: staleOpen
      ? `Tienes una caja abierta del ${businessDate}, sin cerrar (${daysOpen} día${daysOpen === 1 ? '' : 's'}).`
      : null,
  };
}

/** Re-export del helper puro de otros ingresos en efectivo. */
export { sumCashOtherIncomes };
