import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCashRegisterStatusBadge } from './cashRegisterStatusBadge.js';

describe('resolveCashRegisterStatusBadge', () => {
  it('OPEN del día → Abierta verde', () => {
    const b = resolveCashRegisterStatusBadge({ status: 'OPEN', isStaleOpen: false });
    assert.equal(b.kind, 'open');
    assert.equal(b.label, 'Abierta');
    assert.match(b.className, /emerald/);
  });

  it('OPEN stale → Sin cerrar rojo', () => {
    const b = resolveCashRegisterStatusBadge({ status: 'OPEN', isStaleOpen: true });
    assert.equal(b.kind, 'stale');
    assert.equal(b.label, 'Sin cerrar');
    assert.match(b.className, /red/);
  });

  it('CLOSED → Cerrada stone', () => {
    const b = resolveCashRegisterStatusBadge({ status: 'CLOSED' });
    assert.equal(b.kind, 'closed');
    assert.equal(b.label, 'Cerrada');
    assert.match(b.className, /stone/);
  });
});
