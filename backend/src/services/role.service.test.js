import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertNoPrivilegeEscalation,
  assertRoleChangeKeepsAnAdmin,
} from './role.service.js';

describe('assertNoPrivilegeEscalation', () => {
  it('no lanza si los permisos pedidos están dentro de los propios', () => {
    const propios = new Set(['users.view', 'users.manage', 'roles.view']);
    assert.doesNotThrow(() => assertNoPrivilegeEscalation(propios, ['users.view', 'roles.view']));
  });

  it('lanza 403 PRIVILEGE_ESCALATION si pide un permiso que no tiene', () => {
    const propios = new Set(['users.view']);
    assert.throws(
      () => assertNoPrivilegeEscalation(propios, ['users.view', 'roles.manage']),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.reason, 'PRIVILEGE_ESCALATION');
        return true;
      },
    );
  });

  it('trata la ausencia de permisos propios como conjunto vacío (todo pedido excede)', () => {
    assert.throws(() => assertNoPrivilegeEscalation(undefined, ['users.manage']));
  });
});

/**
 * `assertRoleChangeKeepsAnAdmin` recibe un `tx` inyectable (`tx = prisma` por
 * defecto), así que se prueba con un mock simple — mismo patrón que
 * `clientLoyaltyRewards.service.test.js` — en vez de una base de datos real.
 */
function buildFakeTx(otrosAdminsFueraDelRol) {
  return {
    user: {
      count: async () => otrosAdminsFueraDelRol,
    },
  };
}

/** Rol "Contador" con `users.manage`, asignado a 2 usuarios, activo. */
function rolConGestionDeUsuarios({ userCount = 2 } = {}) {
  return {
    id: 5,
    isActive: true,
    _count: { users: userCount },
    permissions: [
      { permission: { code: 'users.manage' } },
      { permission: { code: 'users.view' } },
    ],
  };
}

describe('assertRoleChangeKeepsAnAdmin', () => {
  it('no hace nada si el rol nunca otorgó users.manage', async () => {
    const role = { id: 1, isActive: true, _count: { users: 3 }, permissions: [] };
    const tx = buildFakeTx(0);
    await assert.doesNotReject(() =>
      assertRoleChangeKeepsAnAdmin(role, { nextIsActive: false }, tx),
    );
  });

  it('no hace nada si el rol ya estaba inactivo (no otorgaba nada de verdad)', async () => {
    const role = { ...rolConGestionDeUsuarios(), isActive: false };
    const tx = buildFakeTx(0);
    await assert.doesNotReject(() =>
      assertRoleChangeKeepsAnAdmin(role, { nextPermissionCodes: [] }, tx),
    );
  });

  it('no hace nada si el cambio conserva users.manage (solo cambia el nombre)', async () => {
    const role = rolConGestionDeUsuarios();
    const tx = buildFakeTx(0);
    await assert.doesNotReject(() => assertRoleChangeKeepsAnAdmin(role, {}, tx));
  });

  it('no hace nada si los permisos nuevos siguen incluyendo users.manage', async () => {
    const role = rolConGestionDeUsuarios();
    const tx = buildFakeTx(0);
    await assert.doesNotReject(() =>
      assertRoleChangeKeepsAnAdmin(role, { nextPermissionCodes: ['users.manage'] }, tx),
    );
  });

  it('no hace nada si nadie tiene el rol asignado todavía, aunque se le quite el permiso', async () => {
    const role = rolConGestionDeUsuarios({ userCount: 0 });
    const tx = buildFakeTx(0);
    await assert.doesNotReject(() =>
      assertRoleChangeKeepsAnAdmin(role, { nextPermissionCodes: [] }, tx),
    );
  });

  it('no hace nada si hay administradores activos fuera de este rol', async () => {
    const role = rolConGestionDeUsuarios();
    const tx = buildFakeTx(1);
    await assert.doesNotReject(() =>
      assertRoleChangeKeepsAnAdmin(role, { nextPermissionCodes: [] }, tx),
    );
  });

  it('lanza 409 LAST_ADMIN al quitarle el permiso sin otro admin fuera del rol', async () => {
    const role = rolConGestionDeUsuarios();
    const tx = buildFakeTx(0);
    await assert.rejects(
      () => assertRoleChangeKeepsAnAdmin(role, { nextPermissionCodes: ['users.view'] }, tx),
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.reason, 'LAST_ADMIN');
        return true;
      },
    );
  });

  it('lanza 409 LAST_ADMIN al desactivar el rol sin otro admin fuera de él', async () => {
    const role = rolConGestionDeUsuarios();
    const tx = buildFakeTx(0);
    await assert.rejects(
      () => assertRoleChangeKeepsAnAdmin(role, { nextIsActive: false }, tx),
      { statusCode: 409, reason: 'LAST_ADMIN' },
    );
  });
});
