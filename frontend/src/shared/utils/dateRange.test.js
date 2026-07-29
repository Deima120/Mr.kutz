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

function addDaysToYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

describe('FE dateRange — citas', () => {
  const today = '2026-07-28';
  const publicBounds = getAppointmentDateBounds({
    horizonDays: APPOINTMENT_HORIZON_DAYS_PUBLIC,
    todayYmd: today,
  });
  const staffBounds = getAppointmentDateBounds({
    horizonDays: APPOINTMENT_HORIZON_DAYS_STAFF,
    todayYmd: today,
  });

  it('horizonte por rol', () => {
    assert.equal(horizonDaysForRole('admin'), 365);
    assert.equal(horizonDaysForRole('barber'), 365);
    assert.equal(horizonDaysForRole('client'), 60);
  });

  it('rechaza pasado y acepta borde público', () => {
    assert.equal(validateAppointmentDateYmd('2026-07-27', publicBounds).ok, false);
    assert.equal(validateAppointmentDateYmd(addDaysToYmd(today, 60), publicBounds).ok, true);
    assert.equal(validateAppointmentDateYmd(addDaysToYmd(today, 61), publicBounds).ok, false);
  });

  it('acepta borde staff y rechaza 366', () => {
    assert.equal(validateAppointmentDateYmd(addDaysToYmd(today, 365), staffBounds).ok, true);
    assert.equal(validateAppointmentDateYmd(addDaysToYmd(today, 366), staffBounds).ok, false);
  });

  it('valida orden de filtros', () => {
    assert.equal(validateQueryDateOrder('2026-08-01', '2026-07-01').ok, false);
    assert.equal(validateQueryDateOrder('2026-07-01', '2026-07-28').ok, true);
  });
});
