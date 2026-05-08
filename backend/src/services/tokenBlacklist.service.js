/**
 * Invalidación de JWT tras logout.
 * Prioriza Redis si está configurado; fallback a Postgres (Neon) si no.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt.js';
import { getRedisClient } from '../lib/redis.js';
import prisma from '../lib/prisma.js';

export async function blacklistToken(token) {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret);
  const exp = decoded?.exp;
  if (!exp || typeof exp !== 'number') return;

  const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`jwt:bl:${hash}`, '1', 'EX', ttl);
    return;
  }

  const expiresAt = new Date(Date.now() + ttl * 1000);
  await prisma.tokenBlacklist.upsert({
    where: { tokenHash: hash },
    update: { expiresAt },
    create: { tokenHash: hash, expiresAt },
  });
}

export async function isTokenBlacklisted(token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const redis = getRedisClient();
  if (redis) {
    const hit = await redis.get(`jwt:bl:${hash}`);
    return Boolean(hit);
  }

  await prisma.tokenBlacklist.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  const hit = await prisma.tokenBlacklist.findUnique({
    where: { tokenHash: hash },
    select: { id: true },
  });
  return Boolean(hit);
}
