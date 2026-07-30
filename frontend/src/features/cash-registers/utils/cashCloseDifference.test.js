import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCashCloseDifference } from './cashCloseDifference.js';

describe('resolveCashCloseDifference', () => {
  it('sin contado → empty', () => {
    const r = resolveCashCloseDifference(100000, '');
    assert.equal(r.kind, 'empty');
    assert.equal(r.difference, null);
  });

  it('cuadra → verde', () => {
    const r = resolveCashCloseDifference(100000, '100.000');
    assert.equal(r.kind, 'match');
    assert.equal(r.difference, 0);
    assert.equal(r.label, 'Cuadra');
    assert.match(r.toneClass, /emerald/);
  });

  it('sobra → ámbar', () => {
    const r = resolveCashCloseDifference(100000, '105000');
    assert.equal(r.kind, 'over');
    assert.equal(r.difference, 5000);
    assert.equal(r.label, 'Sobra');
    assert.match(r.toneClass, /amber/);
  });

  it('falta → rojo', () => {
    const r = resolveCashCloseDifference(100000, '90.000');
    assert.equal(r.kind, 'short');
    assert.equal(r.difference, -10000);
    assert.equal(r.label, 'Falta');
    assert.match(r.toneClass, /red/);
  });
});
