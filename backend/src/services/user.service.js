/**
 * Gestión de usuarios del PERSONAL **sin ficha propia**: administradores y
 * cualquier rol nuevo que se cree desde el panel (un contador, por ejemplo).
 *
 * ## Qué entra aquí y qué no
 *
 * **Los clientes y los barberos quedan fuera a propósito.** Cada uno tiene su
 * propio módulo (Clientes, Barberos) que ya cubre alta, edición, activación y
 * borrado — incluido el cambio de rol, que delega en `promoteAccount` de este
 * mismo archivo. Duplicarlo aquí sería mantener dos caminos para lo mismo.
 *
 * Los clientes, además, tienen un candado de seguridad propio: si se pudiera
 * promover a un cliente a administrador desde Usuarios (en vez de desde su
 * propia ficha, con el permiso `users.manage` explícito), alguien que se
 * registró solo para reservar una cita podría acabar con acceso al dinero del
 * negocio. La restricción se aplica en el servidor, no solo ocultando botones.
 *
 * ## Por qué se desactiva en vez de borrar
 *
 * `User` está referenciado por una quincena de relaciones de auditoría (pagos,
 * movimientos de inventario, cajas, gastos, compras, recepciones). Borrar a quien
 * ya operó en el sistema falla contra esas llaves foráneas, y con razón: perder
 * quién registró una venta sería perder la trazabilidad. Por eso la baja normal
 * es desactivar, y el borrado se reserva para altas hechas por error.
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { canonicalEmail } from '../utils/emailCanonical.js';
import { ROLES } from '../config/permissions.js';

const SALT_ROUNDS = 10;

const httpError = (message, statusCode = 400, reason) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  return err;
};

const toDto = (u) => ({
  id: u.id,
  email: u.email,
  is_active: u.isActive,
  role_id: u.roleId,
  role_name: u.role?.name ?? null,
  role_description: u.role?.description ?? null,
  is_system_role: u.role?.isSystem ?? false,
  created_at: u.createdAt,
});

// `barber`/`client` viajan aunque este módulo ya no los liste: hacen falta
// para los candados de `changeRole`/`setActive`/`resetPassword`/`remove`, que
// deben poder detectar y rechazar a alguien con ficha propia aunque se les
// llame directo por API con su id.
const includeAll = {
  role: true,
  barber: { select: { id: true } },
  client: { select: { id: true } },
};

/**
 * Usuarios del personal sin ficha propia. Excluye a quien tenga ficha de
 * cliente o de barbero (se gestionan, incluido su rol, desde su propio
 * módulo) y a quien tenga el rol `client` aunque por algún motivo no tuviera
 * ficha.
 */
export const getAll = async ({ search, roleId, active, limit = 100, offset = 0 } = {}) => {
  const where = {
    role: { name: { not: ROLES.CLIENT } },
    client: null,
    barber: null,
  };

  if (search) {
    where.email = { contains: String(search).trim(), mode: 'insensitive' };
  }
  if (roleId) {
    const id = parseInt(roleId, 10);
    if (Number.isInteger(id)) where.roleId = id;
  }
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: includeAll,
      orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
      take: Math.min(Number(limit) || 100, 200),
      skip: Number(offset) || 0,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: rows.map(toDto), total };
};

export const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id, 10) },
    include: includeAll,
  });
  if (!user) return null;
  if (user.client || user.barber || user.role?.name === ROLES.CLIENT) {
    // Existe, pero no es personal sin ficha: se trata como inexistente para
    // este módulo, en vez de filtrar datos de un cliente o barbero por una
    // ruta que no le toca.
    return null;
  }
  return toDto(user);
};

/**
 * Rol de personal válido: existe, está activo y no es el de cliente ni el de
 * barbero.
 *
 * El rol `barber` se excluye igual que `client`: asignarlo desde aquí solo
 * cambiaría `User.roleId`, sin crear la ficha `Barber` (nombre, teléfono,
 * horarios) que `POST /api/barbers` crea de forma transaccional. El resultado
 * sería una cuenta con rol de barbero pero sin ficha — no aparece en el
 * módulo de Barberos y no puede recibir citas ni horarios. Un barbero se da
 * de alta y se asciende únicamente desde su propio módulo.
 */
async function assertAssignableRole(roleId) {
  const id = parseInt(roleId, 10);
  if (!Number.isInteger(id)) throw httpError('Indica un rol válido.');

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw httpError('El rol indicado no existe.', 404);

  if (role.name === ROLES.CLIENT) {
    throw httpError(
      'El rol de cliente no se asigna desde aquí: los clientes se gestionan en su propio módulo.',
      409,
      'CLIENT_ROLE_NOT_ASSIGNABLE',
    );
  }
  if (role.name === ROLES.BARBER) {
    throw httpError(
      'El rol de barbero no se asigna desde aquí: da de alta al barbero desde su propio módulo, que crea también su ficha y horarios.',
      409,
      'BARBER_ROLE_NOT_ASSIGNABLE',
    );
  }
  if (!role.isActive) {
    throw httpError('Ese rol está desactivado y no se puede asignar.', 409);
  }
  return role;
}

/**
 * Cuántos administradores activos quedarían si se aplicara un cambio.
 *
 * Se usa para no dejar el sistema sin nadie que pueda entrar a arreglarlo. Se
 * cuenta por permiso y no por el nombre del rol, porque tras crear roles
 * personalizados el administrador podría no llamarse «admin».
 */
async function countOtherActiveAdmins(excludeUserId, tx = prisma) {
  return tx.user.count({
    where: {
      id: { not: excludeUserId },
      isActive: true,
      role: {
        isActive: true,
        permissions: { some: { permission: { code: 'users.manage' } } },
      },
    },
  });
}

/** Lanza si el cambio dejaría al sistema sin ningún usuario capaz de gestionar usuarios. */
async function assertNotLastAdmin(userId, tx = prisma) {
  const restantes = await countOtherActiveAdmins(userId, tx);
  if (restantes === 0) {
    throw httpError(
      'Es el único usuario activo que puede gestionar usuarios. Da acceso a otra persona antes de hacer este cambio.',
      409,
      'LAST_ADMIN',
    );
  }
}

export const create = async ({ email, password, roleId }) => {
  const role = await assertAssignableRole(roleId);

  const correo = canonicalEmail(email);
  const existe = await prisma.user.findUnique({ where: { email: correo } });
  if (existe) throw httpError('Ya existe un usuario con ese correo.', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email: correo, passwordHash, roleId: role.id, isActive: true },
    include: includeAll,
  });
  return toDto(user);
};

/**
 * Núcleo del cambio de rol: auto-cambio bloqueado, rol asignable, resguardo
 * del último administrador, actualización. **Sin** candado por ficha propia:
 * lo usa tanto `changeRole` (Usuarios, con el candado puesto más abajo) como
 * `promoteAccount` (Clientes y Barberos, que sí necesitan poder tocar el rol
 * de alguien con ficha).
 *
 * @param {number} actorId quien realiza el cambio, para impedir que se lo haga a sí mismo
 */
async function changeRoleCore(userId, roleId, actorId) {
  if (userId === Number(actorId)) {
    throw httpError('No puedes cambiar tu propio rol.', 409, 'SELF_ROLE_CHANGE');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: includeAll });
  if (!user) throw httpError('Usuario no encontrado.', 404);

  const role = await assertAssignableRole(roleId);
  if (role.id === user.roleId) return toDto(user);

  // Si pierde la capacidad de gestionar usuarios y era el último que la tenía,
  // nadie podría volver a entrar a repararlo.
  const conservaGestion = await prisma.rolePermission.findFirst({
    where: { roleId: role.id, permission: { code: 'users.manage' } },
  });
  if (!conservaGestion) await assertNotLastAdmin(userId);

  const actualizado = await prisma.user.update({
    where: { id: userId },
    data: { roleId: role.id },
    include: includeAll,
  });
  return toDto(actualizado);
}

/** Cambia el rol de un usuario del personal sin ficha propia (Usuarios). */
export const changeRole = async (id, roleId, actorId) => {
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: includeAll });
  if (!user) throw httpError('Usuario no encontrado.', 404);

  if (user.client || user.role?.name === ROLES.CLIENT) {
    throw httpError(
      'Los clientes no cambian de rol. Se gestionan desde el módulo de clientes.',
      409,
      'CLIENT_ROLE_LOCKED',
    );
  }
  if (user.barber) {
    throw httpError(
      'Los barberos no cambian de rol desde aquí. Se gestionan desde el módulo de barberos.',
      409,
      'BARBER_ROLE_LOCKED',
    );
  }

  return changeRoleCore(userId, roleId, actorId);
};

/**
 * Cambia el rol de una cuenta con ficha propia (cliente o barbero). La usan
 * `client.controller.js` y `barber.controller.js` tras resolver el `userId`
 * de la ficha correspondiente; no lleva el candado de `changeRole` porque
 * aquí el cambio se pide explícitamente desde el módulo dueño de esa ficha,
 * con el permiso `users.manage` exigido en la ruta.
 */
export const promoteAccount = async (userId, roleId, actorId) =>
  changeRoleCore(parseInt(userId, 10), roleId, actorId);

/** Activa o desactiva el acceso al sistema. */
export const setActive = async (id, isActive, actorId) => {
  const userId = parseInt(id, 10);
  if (userId === Number(actorId)) {
    throw httpError('No puedes desactivar tu propia cuenta.', 409, 'SELF_DEACTIVATE');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: includeAll });
  if (!user) throw httpError('Usuario no encontrado.', 404);
  if (user.client || user.role?.name === ROLES.CLIENT) {
    throw httpError(
      'El acceso de los clientes se activa desde el módulo de clientes.',
      409,
      'CLIENT_STATUS_LOCKED',
    );
  }
  if (user.barber) {
    throw httpError(
      'El acceso de los barberos se activa desde el módulo de barberos.',
      409,
      'BARBER_STATUS_LOCKED',
    );
  }

  const activar = Boolean(isActive);
  if (!activar) await assertNotLastAdmin(userId);

  const actualizado = await prisma.user.update({
    where: { id: userId },
    data: { isActive: activar },
    include: includeAll,
  });
  return toDto(actualizado);
};

/**
 * Núcleo de restablecer contraseña, sin candado por ficha propia. Lo usan
 * `resetPassword` (Usuarios) y `resetAccountPassword` (Barberos).
 */
async function resetPasswordCore(userId, password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    // Se limpia cualquier código de recuperación pendiente: si había uno en
    // marcha, dejarlo vivo permitiría cambiar la contraseña recién puesta.
    data: { passwordHash, resetCode: null, resetCodeExpires: null, resetCodeAttempts: 0 },
  });
  return true;
}

/** Restablece la contraseña de un usuario del personal sin ficha propia (Usuarios). */
export const resetPassword = async (id, password) => {
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: includeAll });
  if (!user) throw httpError('Usuario no encontrado.', 404);
  if (user.client || user.role?.name === ROLES.CLIENT) {
    throw httpError('Los clientes recuperan su contraseña desde el correo.', 409);
  }
  if (user.barber) {
    throw httpError('La contraseña de un barbero se restablece desde el módulo de barberos.', 409);
  }

  return resetPasswordCore(userId, password);
};

/**
 * Restablece la contraseña de una cuenta con ficha propia. La usa
 * `barber.controller.js` tras resolver el `userId` del barbero.
 */
export const resetAccountPassword = async (userId, password) =>
  resetPasswordCore(parseInt(userId, 10), password);

/**
 * Borrado definitivo. Reservado a altas hechas por error: en cuanto el usuario
 * ha operado en el sistema, las relaciones de auditoría lo impiden.
 */
export const remove = async (id, actorId) => {
  const userId = parseInt(id, 10);
  if (userId === Number(actorId)) {
    throw httpError('No puedes eliminar tu propia cuenta.', 409, 'SELF_DELETE');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: includeAll });
  if (!user) return null;
  if (user.client || user.role?.name === ROLES.CLIENT) {
    throw httpError('Los clientes se eliminan desde su propio módulo.', 409);
  }
  if (user.barber) {
    throw httpError(
      'Este usuario es un barbero: elimínalo desde el módulo de barberos para que se retiren también sus horarios.',
      409,
      'IS_BARBER',
    );
  }

  await assertNotLastAdmin(userId);

  try {
    await prisma.user.delete({ where: { id: userId } });
    return true;
  } catch (error) {
    if (error?.code === 'P2003') {
      throw httpError(
        'No se puede eliminar: el usuario tiene movimientos registrados en el sistema. Desactívalo en su lugar.',
        409,
        'HAS_HISTORY',
      );
    }
    throw error;
  }
};
