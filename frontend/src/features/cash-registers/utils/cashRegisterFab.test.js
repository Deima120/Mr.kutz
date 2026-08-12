import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CASH_REGISTER_FAB_CONTENT_PAD_CLASS,
  CASH_REGISTER_FAB_POSITION_CLASS,
  resolveCashRegisterFabAction,
  resolveCashRegisterFabChrome,
} from './cashRegisterFab.js';
import { shouldShowFullCashBanner } from './cashRegisterBannerVisibility.js';

describe('CashRegisterFab — posición y acción', () => {
  it('posición evita solapar toasts (bottom-20, z-40)', () => {
    assert.match(CASH_REGISTER_FAB_POSITION_CLASS, /bottom-20/);
    assert.match(CASH_REGISTER_FAB_POSITION_CLASS, /z-40/);
    assert.match(CASH_REGISTER_FAB_POSITION_CLASS, /right-5/);
    assert.equal(CASH_REGISTER_FAB_CONTENT_PAD_CLASS, 'pb-24');
  });

  it('acción open/close según estado', () => {
    assert.equal(resolveCashRegisterFabAction({ showOpen: true, showClose: false }), 'open');
    assert.equal(resolveCashRegisterFabAction({ showOpen: false, showClose: true }), 'close');
    assert.equal(resolveCashRegisterFabAction({ showOpen: false, showClose: false }), null);
  });

  it('chrome: punto y label por estado', () => {
    const closed = resolveCashRegisterFabChrome({
      register: null,
      canCharge: false,
      loading: false,
    });
    assert.equal(closed.kind, 'closed');
    assert.equal(closed.action, 'open');
    assert.equal(closed.actionLabel, 'Abrir caja');
    assert.match(closed.dotClass, /amber/);
    assert.equal(closed.stale, false);

    const open = resolveCashRegisterFabChrome({
      canCharge: true,
      loading: false,
      register: { businessDate: '2026-07-30', isStaleOpen: false },
    });
    assert.equal(open.kind, 'open');
    assert.equal(open.action, 'close');
    assert.match(open.dotClass, /emerald/);

    const stale = resolveCashRegisterFabChrome({
      canCharge: true,
      loading: false,
      register: { businessDate: '2026-07-28', isStaleOpen: true, daysOpen: 2 },
    });
    assert.equal(stale.kind, 'stale');
    assert.equal(stale.action, 'close');
    assert.equal(stale.stale, true);
    assert.match(stale.dotClass, /red/);
    assert.equal(stale.fabLabel, 'Día anterior sin cerrar');
  });

  it('rutas: banner en pagos/caja/otros ingresos; FAB en el resto', () => {
    assert.equal(shouldShowFullCashBanner('/payments', ''), true);
    assert.equal(shouldShowFullCashBanner('/payments/new', ''), true);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=cash'), true);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=other-incomes'), true);
    assert.equal(shouldShowFullCashBanner('/clients', ''), false);
    assert.equal(shouldShowFullCashBanner('/reports', '?section=sales'), false);
  });
});
