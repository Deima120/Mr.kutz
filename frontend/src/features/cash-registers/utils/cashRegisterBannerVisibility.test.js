import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowFullCashBanner } from './cashRegisterBannerVisibility.js';

describe('shouldShowFullCashBanner', () => {
  it('Ventas y cobro nuevo → banner completo', () => {
    assert.equal(shouldShowFullCashBanner('/payments', ''), true);
    assert.equal(shouldShowFullCashBanner('/payments/new', ''), true);
    assert.equal(shouldShowFullCashBanner('/payments/new', '?appointmentId=1'), true);
  });

  it('Reportes → Caja y Otros ingresos → banner completo', () => {
    assert.equal(shouldShowFullCashBanner('/reports', '?section=cash'), true);
    assert.equal(shouldShowFullCashBanner('/reports', 'section=cash#cash-live'), true);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=other-incomes'), true);
  });

  it('otras secciones de Reportes → FAB (false)', () => {
    assert.equal(shouldShowFullCashBanner('/reports', ''), false);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=sales'), false);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=expenses'), false);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=summary'), false);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=inventory'), false);
  });

  it('resto de módulos admin → FAB (false)', () => {
    assert.equal(shouldShowFullCashBanner('/clients', ''), false);
    assert.equal(shouldShowFullCashBanner('/services', ''), false);
    assert.equal(shouldShowFullCashBanner('/barbers', ''), false);
    assert.equal(shouldShowFullCashBanner('/inventory', ''), false);
    assert.equal(shouldShowFullCashBanner('/dashboard', ''), false);
    assert.equal(shouldShowFullCashBanner('/purchases', ''), false);
  });
});
