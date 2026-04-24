/**
 * Misma normalización que express-validator `body('email').normalizeEmail()`
 * (usa validator.js: Gmail sin puntos, subdirecciones, etc.).
 * Así create-admin, registro y login usan el mismo valor guardado en BD.
 */

import validator from 'validator';

export function canonicalEmail(email) {
  const s = String(email ?? '').trim();
  if (!s) return '';
  return validator.normalizeEmail(s) || s.toLowerCase();
}
