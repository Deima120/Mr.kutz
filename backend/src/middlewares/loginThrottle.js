/**
 * Limitador de intentos fallidos de login.
 * Producción (REDIS_URL): contadores en Redis.
 * Desarrollo sin Redis: memoria en proceso (se pierde al reiniciar).
 */

import { getRedisClient } from '../lib/redis.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const WINDOW_SEC = Math.ceil(WINDOW_MS / 1000);
const LOCK_SEC = Math.ceil(LOCK_MS / 1000);

const attemptsMemory = new Map();

function keyOf(email, ip) {
  const mail = String(email || '').trim().toLowerCase();
  return `${mail}|${ip || 'unknown'}`;
}

function loginThrottleMemory(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();

  const key = keyOf(email, req.ip);
  req._loginThrottleKey = key;
  const now = Date.now();
  const entry = attemptsMemory.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const seconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(seconds / 60)} minuto(s).`,
      reason: 'LOGIN_LOCKED',
    });
  }

  if (entry && now - entry.firstAttemptAt > WINDOW_MS) {
    attemptsMemory.delete(key);
  }

  next();
}

export function loginThrottle(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();

  const key = keyOf(email, req.ip);
  req._loginThrottleKey = key;

  const redis = getRedisClient();
  if (!redis) {
    return loginThrottleMemory(req, res, next);
  }

  const done = async () => {
    const lockKey = `login:lock:${key}`;
    const locked = await redis.exists(lockKey);
    if (locked) {
      const ttl = await redis.ttl(lockKey);
      const seconds = ttl > 0 ? ttl : LOCK_SEC;
      return res.status(429).json({
        success: false,
        message: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(seconds / 60)} minuto(s).`,
        reason: 'LOGIN_LOCKED',
      });
    }
    next();
  };

  done().catch(next);
}

function registerFailedLoginMemory(req) {
  const key = req._loginThrottleKey;
  if (!key) return;
  const now = Date.now();
  const entry = attemptsMemory.get(key) || { count: 0, firstAttemptAt: now };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
  attemptsMemory.set(key, entry);
}

export async function registerFailedLogin(req) {
  const key = req._loginThrottleKey;
  if (!key) return;

  const redis = getRedisClient();
  if (!redis) {
    registerFailedLoginMemory(req);
    return;
  }

  const failKey = `login:fail:${key}`;
  const count = await redis.incr(failKey);
  if (count === 1) await redis.expire(failKey, WINDOW_SEC);
  if (count >= MAX_ATTEMPTS) {
    await redis.set(`login:lock:${key}`, '1', 'EX', LOCK_SEC);
    await redis.del(failKey);
  }
}

function clearLoginAttemptsMemory(req) {
  const key = req._loginThrottleKey;
  if (key) attemptsMemory.delete(key);
}

export async function clearLoginAttempts(req) {
  const key = req._loginThrottleKey;
  if (!key) return;

  const redis = getRedisClient();
  if (!redis) {
    clearLoginAttemptsMemory(req);
    return;
  }

  await redis.del(`login:fail:${key}`, `login:lock:${key}`);
}
