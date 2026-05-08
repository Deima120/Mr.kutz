/**
 * Rate-limit para recuperación de contraseña.
 * Prioriza Redis; fallback a Postgres/Neon si no hay Redis.
 */

import { getRedisClient } from '../lib/redis.js';
import prisma from '../lib/prisma.js';
import { canonicalEmail } from '../utils/emailCanonical.js';

const WINDOW_SEC = 15 * 60;
const WINDOW_MS = WINDOW_SEC * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export function forgotPasswordThrottle(req, res, next) {
  const redis = getRedisClient();
  if (!redis) return next();

  const emailRaw = req.body?.email;
  const ip = req.ip || 'unknown';

  const run = async () => {
    try {
      if (redis) {
        let emailKey = null;
        if (emailRaw) {
          const emailNorm = canonicalEmail(emailRaw);
          emailKey = `fpw:email:${emailNorm}`;
          const ec = await redis.incr(emailKey);
          if (ec === 1) await redis.expire(emailKey, WINDOW_SEC);
          if (ec > MAX_PER_EMAIL) {
            return res.status(429).json({
              success: false,
              message: 'Demasiadas solicitudes para este correo. Espera unos minutos e inténtalo de nuevo.',
              reason: 'FORGOT_PASSWORD_EMAIL_LIMIT',
            });
          }
        }

        const ipKey = `fpw:ip:${ip}`;
        const ic = await redis.incr(ipKey);
        if (ic === 1) await redis.expire(ipKey, WINDOW_SEC);
        if (ic > MAX_PER_IP) {
          if (emailKey) await redis.decr(emailKey);
          return res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes desde esta red. Espera unos minutos e inténtalo de nuevo.',
            reason: 'FORGOT_PASSWORD_IP_LIMIT',
          });
        }
        return next();
      }

      const now = new Date();
      const winMin = new Date(now.getTime() - WINDOW_MS);

      if (emailRaw) {
        const emailNorm = canonicalEmail(emailRaw);
        const emailCount = await consumeBucket({
          scope: 'forgot_email',
          key: emailNorm,
          now,
          winMin,
        });
        if (emailCount > MAX_PER_EMAIL) {
          return res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes para este correo. Espera unos minutos e inténtalo de nuevo.',
            reason: 'FORGOT_PASSWORD_EMAIL_LIMIT',
          });
        }
      }

      const ipCount = await consumeBucket({
        scope: 'forgot_ip',
        key: ip,
        now,
        winMin,
      });
      if (ipCount > MAX_PER_IP) {
        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes desde esta red. Espera unos minutos e inténtalo de nuevo.',
          reason: 'FORGOT_PASSWORD_IP_LIMIT',
        });
      }

      next();
    } catch (e) {
      next(e);
    }
  };

  run();
}

async function consumeBucket({ scope, key, now, winMin }) {
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
      },
    });
    return 1;
  }

  const stillInWindow = current.windowStart >= winMin;
  const nextCount = stillInWindow ? current.count + 1 : 1;

  await prisma.rateLimitEntry.update({
    where: { scope_key: { scope, key } },
    data: {
      count: nextCount,
      windowStart: stillInWindow ? current.windowStart : now,
      lockedUntil: null,
    },
  });

  return nextCount;
}
