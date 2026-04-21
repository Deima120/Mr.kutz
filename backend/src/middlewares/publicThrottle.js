/**
 * Rate-limit sencillo en memoria para endpoints públicos.
 * Evita abuso de reservas y envío masivo de correos desde una misma IP.
 * No requiere dependencias externas; se resetea al reiniciar el servidor.
 */

const DEFAULT_MAX = 8;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

const buckets = new Map();

export function publicThrottle({
  max = DEFAULT_MAX,
  windowMs = DEFAULT_WINDOW_MS,
  scope = 'default',
} = {}) {
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const key = `${scope}|${ip}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now - entry.start > windowMs) {
      buckets.set(key, { count: 1, start: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retry = Math.ceil((windowMs - (now - entry.start)) / 1000);
      res.set('Retry-After', String(Math.max(1, retry)));
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
        reason: 'RATE_LIMITED',
      });
    }

    next();
  };
}
