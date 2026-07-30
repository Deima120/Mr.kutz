import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveCashRegisterBannerDotClass,
  resolveCashRegisterBannerShellClass,
  resolveCashRegisterBannerState,
} from './cashRegisterBannerState.js';

describe('resolveCashRegisterBannerState', () => {
  it('sin caja → warning + abrir', () => {
    const s = resolveCashRegisterBannerState({ register: null, canCharge: false, loading: false });
    assert.equal(s.kind, 'closed');
    assert.equal(s.variant, 'warning');
    assert.equal(s.showOpen, true);
    assert.equal(s.showLiveLink, false);
  });

  it('caja stale → error reforzado con daysOpen y Ver caja', () => {
    const s = resolveCashRegisterBannerState({
      canCharge: true,
      loading: false,
      register: {
        businessDate: '2026-07-27',
        isStaleOpen: true,
        daysOpen: 2,
        staleWarning: 'Tienes una caja abierta del 2026-07-27, sin cerrar (2 días).',
      },
    });
    assert.equal(s.kind, 'stale');
    assert.equal(s.variant, 'error');
    assert.match(s.message, /2026-07-27/);
    assert.equal(s.showClose, true);
    assert.equal(s.showOpen, false);
    assert.equal(s.showLiveLink, true);
  });

  it('caja del día → success + Ver caja', () => {
    const s = resolveCashRegisterBannerState({
      canCharge: true,
      loading: false,
      register: {
        businessDate: '2026-07-29',
        isStaleOpen: false,
        daysOpen: 0,
      },
    });
    assert.equal(s.kind, 'open');
    assert.equal(s.variant, 'success');
    assert.equal(s.showClose, true);
    assert.equal(s.showLiveLink, true);
  });
});

describe('banner POS shell classes', () => {
  it('mapea colores por estado', () => {
    assert.match(resolveCashRegisterBannerShellClass('open'), /emerald/);
    assert.match(resolveCashRegisterBannerShellClass('stale'), /red/);
    assert.match(resolveCashRegisterBannerShellClass('closed'), /amber/);
    assert.match(resolveCashRegisterBannerDotClass('open'), /emerald/);
    assert.match(resolveCashRegisterBannerDotClass('stale'), /red/);
  });
});
