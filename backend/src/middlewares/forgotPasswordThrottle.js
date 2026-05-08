/**
 * Rate-limit para recuperación de contraseña (email e IP) en Redis.
 * Sin Redis en desarrollo: no limita (solo login tiene fallback en memoria).
 */

import { getRedisClient } from '../lib/redis.js';
import { canonicalEmail } from '../utils/emailCanonical.js';

const WINDOW_SEC = 15 * 60;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export function forgotPasswordThrottle(req, res, next) {
  const redis = getRedisClient();
  if (!redis) return next();

  const emailRaw = req.body?.email;
  const ip = req.ip || 'unknown';

  const run = async () => {
    let emailKey = null;
    try {
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

      next();
    } catch (e) {
      next(e);
    }
  };

  run();
}
