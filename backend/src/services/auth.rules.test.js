import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESET_CODE_TTL_MS,
  RESET_RESEND_COOLDOWN_MS,
  RESET_MAX_VERIFY_ATTEMPTS,
  canRequestPasswordReset,
  isResetInCooldown,
  isResetCodeEligible,
} from './auth.rules.js';

describe('canRequestPasswordReset', () => {
  test('permite a un usuario activo con contraseña propia', () => {
    assert.equal(
      canRequestPasswordReset({ isActive: true, passwordHash: 'hash' }),
      true
    );
  });

  test('rechaza usuario null/undefined', () => {
    assert.equal(canRequestPasswordReset(null), false);
    assert.equal(canRequestPasswordReset(undefined), false);
  });

  test('rechaza cuenta inactiva', () => {
    assert.equal(
      canRequestPasswordReset({ isActive: false, passwordHash: 'hash' }),
      false
    );
  });

  test('rechaza cuenta sin passwordHash (login social/externo)', () => {
    assert.equal(
      canRequestPasswordReset({ isActive: true, passwordHash: null }),
      false
    );
  });
});

describe('isResetInCooldown', () => {
  test('sin código previo no hay cooldown', () => {
    assert.equal(isResetInCooldown({ resetCode: null, resetCodeExpires: null }), false);
  });

  test('código recién emitido está en cooldown', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MS - 1000);
    assert.equal(
      isResetInCooldown({ resetCode: 'x', resetCodeExpires: expiresAt }, now),
      true
    );
  });

  test('justo al cumplirse la ventana de cooldown, ya no aplica (límite exclusivo)', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    const issuedAt = new Date(now.getTime() - RESET_RESEND_COOLDOWN_MS);
    const expiresAt = new Date(issuedAt.getTime() + RESET_CODE_TTL_MS);
    assert.equal(
      isResetInCooldown({ resetCode: 'x', resetCodeExpires: expiresAt }, now),
      false
    );
  });

  test('un código ya vencido no cuenta para el cooldown', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    const expiresAt = new Date(now.getTime() - 1000);
    assert.equal(
      isResetInCooldown({ resetCode: 'x', resetCodeExpires: expiresAt }, now),
      false
    );
  });

  test('fecha de expiración inválida no rompe, simplemente no hay cooldown', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    assert.equal(
      isResetInCooldown({ resetCode: 'x', resetCodeExpires: 'no-es-una-fecha' }, now),
      false
    );
  });
});

describe('isResetCodeEligible', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  test('sin código guardado → reason "missing"', () => {
    const result = isResetCodeEligible({ resetCode: null, resetCodeExpires: null }, now);
    assert.deepEqual(result, { eligible: false, reason: 'missing' });
  });

  test('con expiración pero sin código → reason "missing"', () => {
    const result = isResetCodeEligible(
      { resetCode: null, resetCodeExpires: new Date(now.getTime() + 1000) },
      now
    );
    assert.deepEqual(result, { eligible: false, reason: 'missing' });
  });

  test('código vencido → reason "expired"', () => {
    const result = isResetCodeEligible(
      { resetCode: 'x', resetCodeExpires: new Date(now.getTime() - 1) },
      now
    );
    assert.deepEqual(result, { eligible: false, reason: 'expired' });
  });

  test('justo en el instante de expiración cuenta como vencido (límite inclusivo)', () => {
    const result = isResetCodeEligible(
      { resetCode: 'x', resetCodeExpires: now },
      now
    );
    assert.deepEqual(result, { eligible: true, reason: null });
  });

  test('un instante después de expirar ya no es elegible', () => {
    const result = isResetCodeEligible(
      { resetCode: 'x', resetCodeExpires: new Date(now.getTime() - 1) },
      now
    );
    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'expired');
  });

  test('intentos agotados → reason "max_attempts"', () => {
    const result = isResetCodeEligible(
      {
        resetCode: 'x',
        resetCodeExpires: new Date(now.getTime() + 1000),
        resetCodeAttempts: RESET_MAX_VERIFY_ATTEMPTS,
      },
      now
    );
    assert.deepEqual(result, { eligible: false, reason: 'max_attempts' });
  });

  test('justo un intento antes del máximo sigue siendo elegible', () => {
    const result = isResetCodeEligible(
      {
        resetCode: 'x',
        resetCodeExpires: new Date(now.getTime() + 1000),
        resetCodeAttempts: RESET_MAX_VERIFY_ATTEMPTS - 1,
      },
      now
    );
    assert.deepEqual(result, { eligible: true, reason: null });
  });

  test('sin resetCodeAttempts definido (nunca falló) es elegible', () => {
    const result = isResetCodeEligible(
      { resetCode: 'x', resetCodeExpires: new Date(now.getTime() + 1000) },
      now
    );
    assert.deepEqual(result, { eligible: true, reason: null });
  });

  test('código vigente con intentos restantes es elegible', () => {
    const result = isResetCodeEligible(
      {
        resetCode: 'x',
        resetCodeExpires: new Date(now.getTime() + 1000),
        resetCodeAttempts: 2,
      },
      now
    );
    assert.deepEqual(result, { eligible: true, reason: null });
  });
});
