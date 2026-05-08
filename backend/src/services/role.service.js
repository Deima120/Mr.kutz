/**
 * Servicio de gestión de Roles y sus módulos.
 */

import prisma from '../lib/prisma.js';

const MAX_PAGE_SIZE = 100;

export async function createRole(data, actor) {
  const { name, description, modules } = data;

  const role = await prisma.role.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  if (Array.isArray(modules) && modules.length > 0) {
    const moduleIds = [...new Set(modules.map((m) => Number(m))).values()];
    await prisma.roleModule.createMany({
      data: moduleIds.map((moduleId) => ({ roleId: role.id, moduleId })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'ROLE_CREATE',
      entityType: 'Role',
      entityId: role.id,
      ipAddress: actor?.ip ?? null,
      details: {
        name: role.name,
        description: role.description,
        modules: modules ?? [],
      },
    },
  });

  return getRoleById(role.id);
}

export async function updateRole(id, data, actor) {
  const roleId = Number(id);

  const existing = await prisma.role.findUnique({
    where: { id: roleId },
  });
  if (!existing) return null;

  const updated = await prisma.role.update({
    where: { id: roleId },
    data: {
      name: data.name?.trim() ?? existing.name,
      description:
        data.description !== undefined
          ? data.description?.trim() || null
          : existing.description,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'ROLE_UPDATE',
      entityType: 'Role',
      entityId: roleId,
      ipAddress: actor?.ip ?? null,
      details: {
        before: {
          name: existing.name,
          description: existing.description,
        },
        after: {
          name: updated.name,
          description: updated.description,
        },
      },
    },
  });

  return getRoleById(roleId);
}

export async function listRoles({ limit = 20, offset = 0 } = {}) {
  const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
  const skip = Math.max(Number(offset) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.role.findMany({
      skip,
      take,
      orderBy: { id: 'asc' },
    }),
    prisma.role.count(),
  ]);

  return {
    items,
    total,
    limit: take,
    offset: skip,
  };
}

export async function setRoleState(id, isActive, actor) {
  const roleId = Number(id);

  const existing = await prisma.role.findUnique({
    where: { id: roleId },
  });
  if (!existing) return null;

  const updated = await prisma.role.update({
    where: { id: roleId },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'ROLE_SET_STATE',
      entityType: 'Role',
      entityId: roleId,
      ipAddress: actor?.ip ?? null,
      details: {
        before: { isActive: existing.isActive },
        after: { isActive: updated.isActive },
      },
    },
  });

  return updated;
}

export async function getRoleById(id) {
  const roleId = Number(id);
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      roleModules: {
        include: { module: true },
        orderBy: { moduleId: 'asc' },
      },
    },
  });

  if (!role) return null;

  const { roleModules, ...roleData } = role;
  return {
    ...roleData,
    modules: roleModules.map(({ module }) => module),
  };
}

export async function assignModules(roleIdParam, moduleIds, actor) {
  const roleId = Number(roleIdParam);
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return null;

  const uniqueModules = [...new Set(moduleIds.map((m) => Number(m)))].filter(
    (n) => !Number.isNaN(n),
  );
  if (uniqueModules.length === 0) {
    return getRoleModules(roleId);
  }

  await prisma.roleModule.createMany({
    data: uniqueModules.map((moduleId) => ({ roleId, moduleId })),
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'ROLE_ASSIGN_MODULES',
      entityType: 'Role',
      entityId: roleId,
      ipAddress: actor?.ip ?? null,
      details: {
        modulesAdded: uniqueModules,
      },
    },
  });

  return getRoleModules(roleId);
}

export async function listRoleModules(roleIdParam, { limit = 20, offset = 0 } = {}) {
  const roleId = Number(roleIdParam);
  const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
  const skip = Math.max(Number(offset) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.roleModule.findMany({
      where: { roleId },
      skip,
      take,
      orderBy: { moduleId: 'asc' },
      include: { module: true },
    }),
    prisma.roleModule.count({ where: { roleId } }),
  ]);

  return {
    items,
    total,
    limit: take,
    offset: skip,
  };
}

export async function removeModuleFromRole(roleIdParam, moduleIdParam, actor) {
  const roleId = Number(roleIdParam);
  const moduleId = Number(moduleIdParam);

  const existing = await prisma.roleModule.findUnique({
    where: {
      roleId_moduleId: { roleId, moduleId },
    },
  });
  if (!existing) return false;

  await prisma.roleModule.delete({
    where: {
      roleId_moduleId: { roleId, moduleId },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      action: 'ROLE_REMOVE_MODULE',
      entityType: 'Role',
      entityId: roleId,
      ipAddress: actor?.ip ?? null,
      details: {
        moduleId,
      },
    },
  });

  return true;
}

async function getRoleModules(roleId) {
  const modules = await prisma.roleModule.findMany({
    where: { roleId },
    include: { module: true },
    orderBy: { moduleId: 'asc' },
  });
  return modules;
}

