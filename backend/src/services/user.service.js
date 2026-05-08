/**
 * Servicio de Gestión de Usuarios (admin-only).
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { canonicalEmail } from '../utils/emailCanonical.js';

const SALT_ROUNDS = 10;
const MAX_PAGE_SIZE = 100;

function splitName(nombre) {
  const s = String(nombre || '').trim().replace(/\s+/g, ' ');
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function viewUser(dbUser) {
  const name =
    dbUser?.barber
      ? `${dbUser.barber.firstName} ${dbUser.barber.lastName}`.trim()
      : dbUser?.client
        ? `${dbUser.client.firstName} ${dbUser.client.lastName}`.trim()
        : null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role?.name ?? null,
    isActive: dbUser.isActive,
    nombre: name,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
}

export async function createUser(payload, actor) {
  const email = canonicalEmail(payload.email);
  const password = String(payload.password || payload.contrasenaTemporal || '').trim();
  const roleName = String(payload.role || payload.rol || '').trim();
  const nombre = payload.nombre;

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    const err = new Error('Rol no válido.');
    err.statusCode = 400;
    throw err;
  }
  if (!role.isActive) {
    const err = new Error('No se puede asignar un rol inactivo.');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { firstName, lastName } = splitName(nombre);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
      include: { role: true },
    });

    // Guardar “nombre” en entidad operativa según rol cuando aplique
    if (roleName === 'barber') {
      await tx.barber.create({
        data: {
          userId: user.id,
          firstName: firstName || 'Barbero',
          lastName: lastName || '',
          isActive: true,
        },
      });
    } else if (roleName === 'client') {
      await tx.client.create({
        data: {
          userId: user.id,
          firstName: firstName || 'Cliente',
          lastName: lastName || '',
          email,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        action: 'USER_CREATE',
        entityType: 'User',
        entityId: user.id,
        ipAddress: actor?.ip ?? null,
        details: {
          email,
          role: roleName,
          nombre: String(nombre || '').trim() || null,
        },
      },
    });

    return tx.user.findUnique({
      where: { id: user.id },
      include: { role: true, barber: true, client: true },
    });
  });

  return viewUser(created);
}

export async function listUsers({ limit = 20, offset = 0, search = '' } = {}) {
  const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
  const skip = Math.max(Number(offset) || 0, 0);
  const q = String(search || '').trim();

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { barber: { is: { firstName: { contains: q, mode: 'insensitive' } } } },
          { barber: { is: { lastName: { contains: q, mode: 'insensitive' } } } },
          { client: { is: { firstName: { contains: q, mode: 'insensitive' } } } },
          { client: { is: { lastName: { contains: q, mode: 'insensitive' } } } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      include: { role: true, barber: true, client: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(viewUser),
    total,
    limit: take,
    offset: skip,
  };
}

export async function getUserById(id) {
  const userId = Number(id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, barber: true, client: true },
  });
  return user ? viewUser(user) : null;
}

export async function updateUser(id, payload, actor) {
  const userId = Number(id);
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, barber: true, client: true },
  });
  if (!existing) return null;

  const updates = {};
  const details = { before: viewUser(existing), after: {} };

  if (payload.email !== undefined) {
    updates.email = canonicalEmail(payload.email);
  }

  if (payload.rol !== undefined || payload.role !== undefined) {
    const roleName = String(payload.role ?? payload.rol).trim();
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      const err = new Error('Rol no válido.');
      err.statusCode = 400;
      throw err;
    }
    if (!role.isActive) {
      const err = new Error('No se puede asignar un rol inactivo.');
      err.statusCode = 400;
      throw err;
    }
    updates.roleId = role.id;
  }

  // Actualizar “nombre” si viene, aplicándolo a barber/client cuando exista
  if (payload.nombre !== undefined) {
    const { firstName, lastName } = splitName(payload.nombre);
    if (existing.barber) {
      await prisma.barber.update({
        where: { id: existing.barber.id },
        data: { firstName: firstName || existing.barber.firstName, lastName: lastName ?? existing.barber.lastName },
      });
    } else if (existing.client) {
      await prisma.client.update({
        where: { id: existing.client.id },
        data: { firstName: firstName || existing.client.firstName, lastName: lastName ?? existing.client.lastName },
      });
    }
  }

  let updated = existing;
  if (Object.keys(updates).length > 0) {
    updated = await prisma.user.update({
      where: { id: userId },
      data: updates,
      include: { role: true, barber: true, client: true },
    });
  } else {
    // re-leer por si se actualizó nombre
    updated = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, barber: true, client: true },
    });
  }

  details.after = viewUser(updated);

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: userId,
      ipAddress: actor?.ip ?? null,
      details,
    },
  });

  return viewUser(updated);
}

export async function setUserState(id, isActive, actor) {
  const userId = Number(id);
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, barber: true, client: true },
  });
  if (!existing) return null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    include: { role: true, barber: true, client: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'USER_SET_STATE',
      entityType: 'User',
      entityId: userId,
      ipAddress: actor?.ip ?? null,
      details: {
        before: { isActive: existing.isActive },
        after: { isActive: updated.isActive },
      },
    },
  });

  return viewUser(updated);
}

