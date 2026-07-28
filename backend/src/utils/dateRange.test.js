import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPOINTMENT_HORIZON_DAYS_PUBLIC,
  APPOINTMENT_HORIZON_DAYS_STAFF,
  getAppointmentDateBounds,
  horizonDaysForRole,
  validateAppointmentDateYmd,
  validateQueryDateOrder,
} from './dateRange.js';
import { addDaysToYmd } from './colombiaTime.js';

describe('horizonDaysForRole', () => {
  it('da 365 a staff y 60 a cliente/público', () => {
    assert.equal(horizonDaysForRole('admin'), APPOINTMENT_HORIZON_DAYS_STAFF);
    assert.equal(horizonDaysForRole('barber'), APPOINTMENT_HORIZON_DAYS_STAFF);
    assert.equal(horizonDaysForRole('client'), APPOINTMENT_HORIZON_DAYS_PUBLIC);
    assert.equal(horizonDaysForRole(undefined), APPOINTMENT_HORIZON_DAYS_PUBLIC);
  });
});

describe('validateAppointmentDateYmd', () => {
  const today = '2026-07-28';
  const publicBounds = getAppointmentDateBounds({
    horizonDays: APPOINTMENT_HORIZON_DAYS_PUBLIC,
    todayYmd: today,
  });
  const staffBounds = getAppointmentDateBounds({
    horizonDays: APPOINTMENT_HORIZON_DAYS_STAFF,
    todayYmd: today,
  });

  it('rechaza fecha en el pasado', () => {
    const r = validateAppointmentDateYmd('2026-07-27', publicBounds);
    assert.equal(r.ok, false);
    assert.match(r.message, /anterior a hoy/);
  });

  it('acepta el límite exacto público (hoy + 60)', () => {
    const edge = addDaysToYmd(today, 60);
    const r = validateAppointmentDateYmd(edge, publicBounds);
    assert.equal(r.ok, true);
    assert.equal(r.ymd, edge);
  });

  it('rechaza un día después del límite público', () => {
    const over = addDaysToYmd(today, 61);
    const r = validateAppointmentDateYmd(over, publicBounds);
    assert.equal(r.ok, false);
    assert.match(r.message, /60 días/);
  });

  it('acepta el límite exacto staff (hoy + 365) y rechaza 366', () => {
    const edge = addDaysToYmd(today, 365);
    assert.equal(validateAppointmentDateYmd(edge, staffBounds).ok, true);
    const over = addDaysToYmd(today, 366);
    const r = validateAppointmentDateYmd(over, staffBounds);
    assert.equal(r.ok, false);
    assert.match(r.message, /365 días/);
  });
});

describe('validateQueryDateOrder', () => {
  it('rechaza dateFrom > dateTo', () => {
    const r = validateQueryDateOrder('2026-08-01', '2026-07-01');
    assert.equal(r.ok, false);
    assert.match(r.message, /inicial/);
  });

  it('rechaza rangos mayores a 366 días', () => {
    const r = validateQueryDateOrder('2025-01-01', '2026-07-01');
    assert.equal(r.ok, false);
    assert.match(r.message, /366/);
  });

  it('acepta un rango válido', () => {
    const r = validateQueryDateOrder('2026-07-01', '2026-07-28');
    assert.equal(r.ok, true);
  });
});
