/**
 * Limitador simple de intentos fallidos de login en memoria.
 * No requiere dependencias extra. Se resetea al reiniciar el servidor.
 *
 * Reglas:
 *   - Contador por combinación email+IP.
 *   - Si supera MAX_ATTEMPTS en WINDOW_MS, se bloquea LOCK_MS.
 *   - En login correcto, consumir clearLoginAttempts() para limpiar.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map();

function keyOf(email, ip) {
  const mail = String(email || '').trim().toLowerCase();
  return `${mail}|${ip || 'unknown'}`;
}

export function loginThrottle(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();

  const key = keyOf(email, req.ip);
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const seconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(
        seconds / 60
      )} minuto(s).`,
      reason: 'LOGIN_LOCKED',
    });
  }

  if (entry && now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.delete(key);
  }

  req._loginThrottleKey = key;
  next();
}

export function registerFailedLogin(req) {
  const key = req._loginThrottleKey;
  if (!key) return;
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, firstAttemptAt: now };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
  attempts.set(key, entry);
}

export function clearLoginAttempts(req) {
  const key = req._loginThrottleKey;
  if (key) attempts.delete(key);
}
