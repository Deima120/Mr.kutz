import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countOtherActiveAdmins, assertNotLastAdmin } from './user.service.js';

/**
 * `countOtherActiveAdmins`/`assertNotLastAdmin` aceptan un `tx` inyectable
 * (`tx = prisma` por defecto), así que se prueban con un mock simple en vez de
 * una base de datos real — mismo patrón que `clientLoyaltyRewards.service.test.js`.
 */

function buildFakeTx(activeAdminUserIds) {
  const ids = new Set(activeAdminUserIds);
  return {
    user: {
      count: async ({ where }) => {
        // Simula el filtro real: activos, con permiso users.manage (ya
        // codificado en `ids`), excluyendo `id.not`.
        let count = ids.size;
        if (where?.id?.not != null && ids.has(where.id.not)) count -= 1;
        return count;
      },
    },
  };
}

describe('countOtherActiveAdmins', () => {
  it('cuenta los administradores activos excluyendo al propio usuario', async () => {
    const tx = buildFakeTx([1, 2, 3]);
    assert.equal(await countOtherActiveAdmins(1, tx), 2);
  });

  it('da 0 si el único administrador es el propio usuario', async () => {
    const tx = buildFakeTx([1]);
    assert.equal(await countOtherActiveAdmins(1, tx), 0);
  });

  it('no descuenta si el usuario excluido no estaba en el conteo (no es admin)', async () => {
    const tx = buildFakeTx([2, 3]);
    assert.equal(await countOtherActiveAdmins(99, tx), 2);
  });
});

describe('assertNotLastAdmin', () => {
  it('no lanza si quedan otros administradores activos', async () => {
    const tx = buildFakeTx([1, 2]);
    await assert.doesNotReject(() => assertNotLastAdmin(1, tx));
  });

  it('lanza 409 LAST_ADMIN si el usuario es el único administrador activo', async () => {
    const tx = buildFakeTx([1]);
    await assert.rejects(() => assertNotLastAdmin(1, tx), (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, 'LAST_ADMIN');
      return true;
    });
  });
});
