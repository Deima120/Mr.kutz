/**
 * Cliente Redis (rate-limit, blacklist JWT).
 * Opcional: si REDIS_URL no existe, se usa fallback en Postgres.
 */

import Redis from 'ioredis';

let client = null;

export function assertRedisConfiguredForProduction() {
  // Compatibilidad: Redis dejó de ser obligatorio en producción.
  // Si no existe REDIS_URL, el sistema usa fallback en Postgres.
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
