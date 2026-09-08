/**
 * Gestión de usuarios (`/api/users`): el único lugar donde se cambia el rol,
 * se ve el detalle y se restablece la contraseña de cualquier cuenta del
 * sistema, tenga o no ficha propia (cliente, barbero, o personal sin ficha
 * como un administrador o un contador).
 *
 * ## Por qué está centralizado aquí
 *
 * Se intentó repartir el cambio de rol a la ficha de cada quien (Clientes,
 * Barberos), pero el propietario del proyecto pidió revertirlo: el rol de
 * una cuenta es un concepto transversal a cliente/barbero/personal, y quiere
 * un único lugar de auditoría y control para tocarlo, verlo en detalle y
 * restablecer el acceso. Clientes y Barberos conservan todo lo demás (alta,
 * edición de la ficha, activar/inactivar), que sigue siendo específico de
 * cada uno.
 *
 * ## El candado que SÍ se mantiene: qué rol se puede asignar
 *
 * `client` y `barber` no se pueden asignar como rol destino aunque el cambio
 * se pida desde aquí: asignarlos solo tocaría `User.roleId`, sin crear la
 * ficha (`Client`/`Barber`, y en el caso del barbero también sus horarios)
 * que las altas de sus propios módulos crean de forma transaccional. El
 * resultado sería una cuenta con ese rol pero sin ficha, huérfana. Esto no
 * es negociable por diseño de datos, aunque el resto del cambio de rol sí lo
 * sea por decisión de negocio.
 *
 * Promover a un cliente a un rol de personal (admin, un rol personalizado)
 * SÍ está permitido desde aquí, con `users.manage` exigido en la ruta como
 * única barrera: es el requisito explícito de negocio, y el permiso es la
 * mitigación acordada para el riesgo de que alguien que se registró para
 * agendar acabe con acceso al dinero del negocio.
 *
 * ## Qué sigue viviendo en el módulo de cada ficha
 *
 * `Client.isActive` (puede agendar) y `Barber.isActive` (está en el equipo)
 * son conceptos de la ficha, no de la cuenta, y sus altas/ediciones/borrados
 * de ficha siguen en Clientes/Barberos. `setActive`/`remove` de este archivo
 * respetan esa frontera: activar o borrar a un cliente sigue bloqueado aquí;
 * un barbero sí se activa/desactiva desde aquí porque así funcionaba antes
 * de que existiera este módulo (sincroniza `User.isActive` y
 * `Barber.isActive` a la vez), y borrarlo sigue exigiendo pasar por Barberos
 * para que se retiren también sus horarios.
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
  // De qué ficha dispone. Sirve para que la pantalla explique por qué a un
  // cliente no se le puede activar/inactivar o borrar desde aquí, por
  // ejemplo, y para el enlace de "ver detalle".
  client_id: u.client?.id ?? null,
  client_name: u.client ? `${u.client.firstName} ${u.client.lastName}`.trim() : null,
  barber_id: u.barber?.id ?? null,
  barber_name: u.barber ? `${u.barber.firstName} ${u.barber.lastName}`.trim() : null,
  created_at: u.createdAt,
});

const includeAll = {
  role: true,
  barber: { select: { id: true, firstName: true, lastName: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
};

/** Detalle completo: la ficha (cliente o barbero) si tiene una. */
const includeDetail = {
  role: true,
  barber: true,
  client: true,
};

const toDetailDto = (u) => {
  const base = toDto(u);
  if (u.client) {
    return {
      ...base,
      profile_type: 'client',
      profile: {
        phone: u.client.phone,
        document_type: u.client.documentType,
        document_number: u.client.documentNumber,
        notes: u.client.notes,
        is_active: u.client.isActive,
      },
    };
  }
  if (u.barber) {
    return {
      ...base,
      profile_type: 'barber',
      profile: {
        phone: u.barber.phone,
        document_type: u.barber.documentType,
        document_number: u.barber.documentNumber,
        specialties: u.barber.specialties,
        commission_percent:
          u.barber.commissionPercent != null ? Number(u.barber.commissionPercent) : null,
        is_active: u.barber.isActive,
      },
    };
  }
  return { ...base, profile_type: null, profile: null };
};

/** Todas las cuentas del sistema, con o sin ficha propia. */
export const getAll = async ({ search, roleId, active, limit = 100, offset = 0 } = {}) => {
  const where = {};

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

/** Detalle de una cuenta, con la ficha completa si tiene una (cliente o barbero). */
export const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id, 10) },
    include: includeDetail,
  });
  if (!user) return null;
  return toDetailDto(user);
};

/**
 * Rol asignable: existe, está activo y no es el de cliente ni el de barbero.
 *
 * `client`/`barber` se excluyen siempre como destino, sin importar desde
 * dónde se pida el cambio: asignarlos aquí solo cambiaría `User.roleId`, sin
 * crear la ficha (`Client`/`Barber`, y en el caso del barbero también sus
 * horarios) que las altas de sus propios módulos crean de forma
 * transaccional. El resultado sería una cuenta con ese rol pero sin ficha —
 * no aparecería en el módulo correspondiente y, si es barbero, no podría
 * recibir citas ni horarios.
 */
async function assertAssignableRole(roleId) {
  const id = parseInt(roleId, 10);
  if (!Number.isInteger(id)) throw httpError('Indica un rol válido.');

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw httpError('El rol indicado no existe.', 404);

  if (role.name === ROLES.CLIENT) {
    throw httpError(
      'El rol de cliente no se asigna así: nace solo del alta de cliente o del registro público.',
      409,
      'CLIENT_ROLE_NOT_ASSIGNABLE',
    );
  }
  if (role.name === ROLES.BARBER) {
    throw httpError(
      'El rol de barbero no se asigna así: da de alta al barbero desde su propio módulo, que crea también su ficha y horarios.',
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
 * Cambia el rol de cualquier cuenta (cliente, barbero o personal sin ficha).
 *
 * @param {number} actorId quien realiza el cambio, para impedir que se lo haga a sí mismo
 */
export const changeRole = async (id, roleId, actorId) => {
  const userId = parseInt(id, 10);
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
};

/**
 * Activa o desactiva el acceso al sistema.
 *
 * Un cliente sigue sin poder activarse/inactivarse desde aquí: `Client.isActive`
 * (puede agendar) es un concepto de la ficha, con reglas propias (no cancela
 * citas ya agendadas) que viven en `client.service.js`. Un barbero sí, porque
 * así funcionaba desde antes de que existiera este módulo: se mantienen
 * alineadas su ficha y su acceso, para que un barbero sin acceso tampoco
 * siga figurando como activo en el equipo.
 */
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

  const activar = Boolean(isActive);
  if (!activar) await assertNotLastAdmin(userId);

  const actualizado = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { isActive: activar },
      include: includeAll,
    });
    if (u.barber) {
      await tx.barber.update({ where: { id: u.barber.id }, data: { isActive: activar } });
    }
    return u;
  });

  return toDto(actualizado);
};

/** Restablece la contraseña de cualquier cuenta a una temporal elegida por el administrador. */
export const resetPassword = async (id, password) => {
  const userId = parseInt(id, 10);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError('Usuario no encontrado.', 404);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    // Se limpia cualquier código de recuperación pendiente: si había uno en
    // marcha, dejarlo vivo permitiría cambiar la contraseña recién puesta.
    data: { passwordHash, resetCode: null, resetCodeExpires: null, resetCodeAttempts: 0 },
  });
  return true;
};

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
