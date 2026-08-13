/**
 * Limitador de intentos fallidos de login en memoria.
 * No requiere dependencias extra. Se resetea al reiniciar el servidor.
 *
 * Reglas:
 *   - Contador por combinación email+IP (ataque dirigido a una cuenta).
 *   - Contador ADICIONAL solo por IP (password spraying: probar una contraseña
 *     común contra muchas cuentas distintas desde la misma IP). Sin este segundo
 *     contador, variar el email dejaba el límite en nada.
 *   - Si supera su máximo dentro de WINDOW_MS, se bloquea LOCK_MS.
 *   - En login correcto, consumir clearLoginAttempts() para limpiar.
 *
 * Limitación conocida: el estado vive en el proceso, así que no se comparte entre
 * instancias ni sobrevive a un redeploy. Para varias instancias hace falta Redis.
 *
 * Requiere `app.set('trust proxy', 1)` para que `req.ip` sea la IP real del cliente
 * y no la del balanceador (si no, todos comparten la misma cubeta).
 */

const MAX_ATTEMPTS = 5;
/** Más laxo que por cuenta: una IP legítima (oficina, NAT) tiene varios usuarios. */
const MAX_IP_ATTEMPTS = 20;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

/** Barrido periódico: sin él los Map crecen sin cota (una entrada por email/IP visto). */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const attempts = new Map();
const ipAttempts = new Map();

function keyOf(email, ip) {
  const mail = String(email || '').trim().toLowerCase();
  return `${mail}|${ip || 'unknown'}`;
}

function ipKeyOf(ip) {
  return String(ip || 'unknown');
}

/** Una entrada es descartable si no está bloqueada y su ventana ya venció. */
function isExpired(entry, now) {
  if (!entry) return true;
  if (entry.lockedUntil && entry.lockedUntil > now) return false;
  return now - entry.firstAttemptAt > WINDOW_MS;
}

function sweep(now = Date.now()) {
  let removed = 0;
  for (const [key, entry] of attempts) {
    if (isExpired(entry, now)) {
      attempts.delete(key);
      removed += 1;
    }
  }
  for (const [key, entry] of ipAttempts) {
    if (isExpired(entry, now)) {
      ipAttempts.delete(key);
      removed += 1;
    }
  }
  return removed;
}

// unref() para no mantener vivo el proceso solo por este temporizador.
const sweepTimer = setInterval(() => sweep(), SWEEP_INTERVAL_MS);
if (typeof sweepTimer.unref === 'function') sweepTimer.unref();

function lockedResponse(res, lockedUntil, now) {
  const minutes = Math.ceil((lockedUntil - now) / 1000 / 60);
  return res.status(429).json({
    success: false,
    message: `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`,
    reason: 'LOGIN_LOCKED',
  });
}

export function loginThrottle(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();

  const now = Date.now();
  const key = keyOf(email, req.ip);
  const ipKey = ipKeyOf(req.ip);

  const entry = attempts.get(key);
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return lockedResponse(res, entry.lockedUntil, now);
  }

  const ipEntry = ipAttempts.get(ipKey);
  if (ipEntry?.lockedUntil && ipEntry.lockedUntil > now) {
    return lockedResponse(res, ipEntry.lockedUntil, now);
  }

  if (entry && now - entry.firstAttemptAt > WINDOW_MS) attempts.delete(key);
  if (ipEntry && now - ipEntry.firstAttemptAt > WINDOW_MS) ipAttempts.delete(ipKey);

  req._loginThrottleKey = key;
  req._loginThrottleIpKey = ipKey;
  next();
}

function bump(map, key, max, now) {
  const entry = map.get(key) || { count: 0, firstAttemptAt: now };
  entry.count += 1;
  if (entry.count >= max) entry.lockedUntil = now + LOCK_MS;
  map.set(key, entry);
}

export function registerFailedLogin(req) {
  const now = Date.now();
  if (req._loginThrottleKey) {
    bump(attempts, req._loginThrottleKey, MAX_ATTEMPTS, now);
  }
  if (req._loginThrottleIpKey) {
    bump(ipAttempts, req._loginThrottleIpKey, MAX_IP_ATTEMPTS, now);
  }
}

export function clearLoginAttempts(req) {
  // Solo se limpia el contador de la cuenta: el de la IP debe sobrevivir a un
  // login correcto, o bastaría acertar una cuenta para reiniciar el spraying.
  if (req._loginThrottleKey) attempts.delete(req._loginThrottleKey);
}

/** Solo para tests. */
export const __testing = {
  sweep,
  reset() {
    attempts.clear();
    ipAttempts.clear();
  },
  sizes: () => ({ attempts: attempts.size, ipAttempts: ipAttempts.size }),
  MAX_ATTEMPTS,
  MAX_IP_ATTEMPTS,
  WINDOW_MS,
};
