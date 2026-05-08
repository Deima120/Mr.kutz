/**
 * Limitador de intentos fallidos de login.
 * Prioriza Redis si está configurado.
 * Fallback a Postgres/Neon (tabla rate_limit_entries) si no hay Redis.
 */

import { getRedisClient } from '../lib/redis.js';
import prisma from '../lib/prisma.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const WINDOW_SEC = Math.ceil(WINDOW_MS / 1000);
const LOCK_SEC = Math.ceil(LOCK_MS / 1000);

function keyOf(email, ip) {
  const mail = String(email || '').trim().toLowerCase();
  return `${mail}|${ip || 'unknown'}`;
}

export function loginThrottle(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();

  const key = keyOf(email, req.ip);
  req._loginThrottleKey = key;

  const redis = getRedisClient();
  const now = new Date();
  const scope = 'login';

  const done = async () => {
    if (redis) {
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
      return next();
    }

    const entry = await prisma.rateLimitEntry.findUnique({
      where: { scope_key: { scope, key } },
      select: { lockedUntil: true },
    });

    if (entry?.lockedUntil && entry.lockedUntil > now) {
      const seconds = Math.ceil((entry.lockedUntil.getTime() - now.getTime()) / 1000);
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

export async function registerFailedLogin(req) {
  const key = req._loginThrottleKey;
  if (!key) return;

  const redis = getRedisClient();
  if (redis) {
    const failKey = `login:fail:${key}`;
    const count = await redis.incr(failKey);
    if (count === 1) await redis.expire(failKey, WINDOW_SEC);
    if (count >= MAX_ATTEMPTS) {
      await redis.set(`login:lock:${key}`, '1', 'EX', LOCK_SEC);
      await redis.del(failKey);
    }
    return;
  }

  const scope = 'login';
  const now = new Date();
  const windowStartMin = new Date(now.getTime() - WINDOW_MS);
  const lockUntil = new Date(now.getTime() + LOCK_MS);

  const current = await prisma.rateLimitEntry.findUnique({
    where: { scope_key: { scope, key } },
  });

  if (!current) {
    await prisma.rateLimitEntry.create({
      data: {
        scope,
        key,
        count: 1,
        windowStart: now,
        lockedUntil: null,
      },
    });
    return;
  }

  const stillInWindow = current.windowStart >= windowStartMin;
  const nextCount = stillInWindow ? current.count + 1 : 1;

  await prisma.rateLimitEntry.update({
    where: { scope_key: { scope, key } },
    data: {
      count: nextCount,
      windowStart: stillInWindow ? current.windowStart : now,
      lockedUntil: nextCount >= MAX_ATTEMPTS ? lockUntil : null,
    },
  });
}

export async function clearLoginAttempts(req) {
  const key = req._loginThrottleKey;
  if (!key) return;

  const redis = getRedisClient();
  if (redis) {
    await redis.del(`login:fail:${key}`, `login:lock:${key}`);
    return;
  }

  await prisma.rateLimitEntry.deleteMany({
    where: { scope: 'login', key },
  });
}
