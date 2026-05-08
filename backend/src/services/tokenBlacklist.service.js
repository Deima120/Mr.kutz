/**
 * Invalidación de JWT tras logout (Redis).
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt.js';
import { getRedisClient } from '../lib/redis.js';

export async function blacklistToken(token) {
  const redis = getRedisClient();
  if (!redis) return;

  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret);
  const exp = decoded?.exp;
  if (!exp || typeof exp !== 'number') return;

  const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await redis.set(`jwt:bl:${hash}`, '1', 'EX', ttl);
}

export async function isTokenBlacklisted(token) {
  const redis = getRedisClient();
  if (!redis) return false;

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const hit = await redis.get(`jwt:bl:${hash}`);
  return Boolean(hit);
}
