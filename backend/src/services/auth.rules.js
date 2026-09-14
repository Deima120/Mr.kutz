/**
 * Reglas puras de autenticación/recuperación de contraseña — sin Prisma, sin
 * crypto async, testeables con `node --test` igual que el resto de módulos
 * `*Rules.js`/`*.helpers.js` del proyecto.
 *
 * `auth.service.js` es el único orquestador (consulta Prisma, hashea con
 * bcrypt, envía el correo); este módulo solo decide, dado un estado ya
 * resuelto, qué se permite hacer.
 */

/** Vida del código OTP de recuperación. */
export const RESET_CODE_TTL_MS = 30 * 60 * 1000;
/** Ventana mínima entre dos envíos del código a la misma cuenta. */
export const RESET_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
/** Intentos de verificación permitidos antes de invalidar el código. */
export const RESET_MAX_VERIFY_ATTEMPTS = 5;

/**
 * ¿Esta cuenta puede siquiera pedir/usar recuperación de contraseña? Falla
 * cerrado ante cualquier dato faltante — sin usuario, inactivo, o sin
 * contraseña propia (cuentas creadas sin login local no tienen `passwordHash`).
 * @param {{ isActive?: boolean, passwordHash?: string|null } | null | undefined} user
 */
export function canRequestPasswordReset(user) {
  if (!user) return false;
  if (!user.isActive) return false;
  if (!user.passwordHash) return false;
  return true;
}

/**
 * ¿Ya se le mandó un código a esta cuenta hace menos de
 * `RESET_RESEND_COOLDOWN_MS`? Evita que pedir "reenviar código" muchas veces
 * seguidas dispare un correo cada vez. Un código ya vencido no cuenta —
 * dejaría a alguien bloqueado esperando el cooldown de un código inútil.
 * @param {{ resetCode?: string|null, resetCodeExpires?: Date|string|null }} user
 * @param {Date} [now]
 */
export function isResetInCooldown(user, now = new Date()) {
  if (!user?.resetCodeExpires || !user?.resetCode) return false;
  const expiresAt = new Date(user.resetCodeExpires);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) return false;
  const issuedAt = new Date(expiresAt.getTime() - RESET_CODE_TTL_MS);
  return now.getTime() - issuedAt.getTime() < RESET_RESEND_COOLDOWN_MS;
}

/**
 * ¿El código OTP guardado sigue siendo elegible para verificarse? No mira el
 * código que el usuario escribió (esa comparación es un hash async, vive en
 * `resetCodeHash.js`) — solo el ESTADO: que exista, no haya expirado y no se
 * hayan agotado los intentos. Es la misma regla que antes vivía repetida
 * inline en `verifyResetCode`, ahora en un solo lugar y con casos límite
 * cubiertos por tests (justo antes/después de expirar, justo en el último
 * intento permitido).
 * @param {{ resetCode?: string|null, resetCodeExpires?: Date|string|null, resetCodeAttempts?: number }} user
 * @param {Date} [now]
 * @returns {{ eligible: boolean, reason: 'missing'|'expired'|'max_attempts'|null }}
 */
export function isResetCodeEligible(user, now = new Date()) {
  if (!user?.resetCode || !user?.resetCodeExpires) {
    return { eligible: false, reason: 'missing' };
  }
  const expiresAt = new Date(user.resetCodeExpires);
  if (Number.isNaN(expiresAt.getTime()) || now > expiresAt) {
    return { eligible: false, reason: 'expired' };
  }
  if ((user.resetCodeAttempts ?? 0) >= RESET_MAX_VERIFY_ATTEMPTS) {
    return { eligible: false, reason: 'max_attempts' };
  }
  return { eligible: true, reason: null };
}
