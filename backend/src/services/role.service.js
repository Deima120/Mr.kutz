/**
 * Roles y sus permisos.
 *
 * El catálogo de permisos NO se gestiona desde aquí: vive en
 * `src/config/permissions.js` y lo vuelca el seed. Un permiso que ningún código
 * consulte no haría nada, así que crearlos desde el panel sería engañoso. Lo que
 * sí se gestiona es **qué permisos tiene cada rol**, que es lo que permite crear
 * un «Contador» con acceso de solo lectura a lo financiero.
 *
 * Tres roles son de sistema —`admin`, `barber` y `client`— y están marcados con
 * `isSystem`. No se borran ni se renombran porque son la base del flujo de
 * negocio: media aplicación asume que existen.
 */

import prisma from '../lib/prisma.js';
import { PERMISSIONS, MODULE_LABELS, ROLES } from '../config/permissions.js';

const httpError = (message, statusCode = 400, reason) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  return err;
};

const toDto = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  is_system: role.isSystem,
  is_active: role.isActive,
  user_count: role._count?.users ?? 0,
  permissions: (role.permissions ?? []).map((rp) => rp.permission.code),
});

const includeAll = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
};

export const getAll = async () => {
  const roles = await prisma.role.findMany({
    include: includeAll,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  return roles.map(toDto);
};

export const getById = async (id) => {
  const role = await prisma.role.findUnique({
    where: { id: parseInt(id, 10) },
    include: includeAll,
  });
  return role ? toDto(role) : null;
};

/** Catálogo completo, agrupado por módulo para pintarlo en la pantalla de roles. */
export const getPermissionCatalog = async () => {
  const filas = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  const porModulo = new Map();

  for (const p of filas) {
    if (!porModulo.has(p.module)) {
      porModulo.set(p.module, {
        module: p.module,
        label: MODULE_LABELS[p.module] ?? p.module,
        permissions: [],
      });
    }
    porModulo.get(p.module).permissions.push({
      id: p.id,
      code: p.code,
      description: p.description,
    });
  }

  // Se respeta el orden en que están declarados los módulos en el catálogo, que
  // agrupa por afinidad (operación, dinero, sistema) mejor que el alfabético.
  const orden = Object.keys(MODULE_LABELS);
  return [...porModulo.values()].sort(
    (a, b) => orden.indexOf(a.module) - orden.indexOf(b.module),
  );
};

const nombreLibre = async (name, excludeId = null) => {
  const existe = await prisma.role.findFirst({
    where: {
      name: { equals: String(name).trim(), mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return !existe;
};

/**
 * Comprueba que quien asigna permisos no conceda ninguno que él mismo no tenga.
 *
 * Sin esto, cualquiera con `roles.manage` podría crear un rol con todos los
 * permisos, asignárselo y convertirse en administrador: la propia capacidad de
 * gestionar roles sería una escalada de privilegios completa.
 */
function assertNoPrivilegeEscalation(actorPermissions, codigosPedidos) {
  const propios = actorPermissions ?? new Set();
  const excede = codigosPedidos.filter((c) => !propios.has(c));
  if (excede.length > 0) {
    throw httpError(
      `No puedes conceder permisos que tú no tienes: ${excede.slice(0, 5).join(', ')}${excede.length > 5 ? '…' : ''}`,
      403,
      'PRIVILEGE_ESCALATION',
    );
  }
}

/** Traduce códigos a ids, rechazando los que no existan en el catálogo. */
async function resolvePermissionIds(codigos) {
  const lista = Array.isArray(codigos) ? [...new Set(codigos.map(String))] : [];
  if (lista.length === 0) return [];

  const filas = await prisma.permission.findMany({ where: { code: { in: lista } } });
  if (filas.length !== lista.length) {
    const encontrados = new Set(filas.map((f) => f.code));
    const desconocidos = lista.filter((c) => !encontrados.has(c));
    throw httpError(`Permisos desconocidos: ${desconocidos.join(', ')}`);
  }
  return filas.map((f) => f.id);
}

export const create = async ({ name, description, permissions = [] }, actorPermissions) => {
  const nombre = String(name ?? '').trim();
  if (!nombre) throw httpError('Indica el nombre del rol.');
  if (!(await nombreLibre(nombre))) throw httpError('Ya existe un rol con ese nombre.', 409);

  assertNoPrivilegeEscalation(actorPermissions, permissions);
  const permissionIds = await resolvePermissionIds(permissions);

  const role = await prisma.role.create({
    data: {
      name: nombre,
      description: description ? String(description).trim().slice(0, 255) : null,
      isSystem: false,
      isActive: true,
      permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
    include: includeAll,
  });
  return toDto(role);
};

export const update = async (id, { name, description, isActive, permissions }, actorPermissions) => {
  const roleId = parseInt(id, 10);
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: includeAll });
  if (!role) throw httpError('Rol no encontrado.', 404);

  const data = {};

  if (name !== undefined) {
    const nombre = String(name).trim();
    if (!nombre) throw httpError('Indica el nombre del rol.');
    if (role.isSystem && nombre.toLowerCase() !== role.name.toLowerCase()) {
      throw httpError(
        'Los roles del sistema no se pueden renombrar: hay código que depende de su nombre.',
        409,
        'SYSTEM_ROLE',
      );
    }
    if (!(await nombreLibre(nombre, roleId))) throw httpError('Ya existe un rol con ese nombre.', 409);
    data.name = nombre;
  }

  if (description !== undefined) {
    data.description = description ? String(description).trim().slice(0, 255) : null;
  }

  if (isActive !== undefined) {
    if (role.isSystem && !isActive) {
      throw httpError('Los roles del sistema no se pueden desactivar.', 409, 'SYSTEM_ROLE');
    }
    data.isActive = Boolean(isActive);
  }

  // Los permisos de `admin` no se tocan: es el rol que garantiza que siempre haya
  // alguien capaz de reparar una configuración equivocada.
  if (permissions !== undefined) {
    if (role.name === ROLES.ADMIN) {
      throw httpError(
        'Los permisos del rol de administrador no se modifican: es el que garantiza el acceso de rescate.',
        409,
        'ADMIN_ROLE_LOCKED',
      );
    }
    assertNoPrivilegeEscalation(actorPermissions, permissions);
  }

  const permissionIds = permissions !== undefined ? await resolvePermissionIds(permissions) : null;

  const actualizado = await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.role.update({ where: { id: roleId }, data });
    }
    if (permissionIds) {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }
    }
    return tx.role.findUnique({ where: { id: roleId }, include: includeAll });
  });

  return toDto(actualizado);
};

export const remove = async (id) => {
  const roleId = parseInt(id, 10);
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: includeAll });
  if (!role) return null;

  if (role.isSystem) {
    throw httpError('Los roles del sistema no se pueden eliminar.', 409, 'SYSTEM_ROLE');
  }
  if ((role._count?.users ?? 0) > 0) {
    throw httpError(
      `No se puede eliminar: ${role._count.users} usuario(s) tienen este rol. Cámbiales el rol primero.`,
      409,
      'ROLE_IN_USE',
    );
  }

  await prisma.role.delete({ where: { id: roleId } });
  return true;
};

/** Los permisos declarados en el catálogo, por si hace falta comparar con la base. */
export const catalogSize = () => PERMISSIONS.length;
