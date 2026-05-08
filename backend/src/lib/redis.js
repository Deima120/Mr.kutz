/**
 * Cliente Redis (rate-limit, blacklist JWT).
 * Producción: REDIS_URL obligatorio (validado en index.js).
 */

import Redis from 'ioredis';

let client = null;

export function assertRedisConfiguredForProduction() {
  if (process.env.NODE_ENV !== 'production') return;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    console.error('En producción define REDIS_URL para rate-limit y cierre de sesión seguro.');
    process.exit(1);
  }
}

export function getRedisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
    });
    client.on('error', (err) => {
      console.error('[redis]', err?.message || err);
    });
  }
  return client;
}
