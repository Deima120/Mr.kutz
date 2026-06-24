/**
 * Hash rápido para códigos OTP de recuperación (válidos 30 min).
 * SHA-256 + pepper; compatible con hashes bcrypt antiguos en BD.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

function getPepper() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  return secret.length >= 16 ? secret : 'mr-kutz-reset-pepper-dev';
}

export function hashResetCode(code) {
  const normalized = String(code ?? '').trim();
  return createHash('sha256').update(`${getPepper()}:${normalized}`).digest('hex');
}

export async function verifyResetCodeHash(code, storedHash) {
  if (!storedHash || code == null) return false;
  const normalized = String(code).trim();
  if (!normalized) return false;

  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(normalized, storedHash);
  }

  const computed = hashResetCode(normalized);
  if (computed.length !== storedHash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  } catch {
    return false;
  }
}
