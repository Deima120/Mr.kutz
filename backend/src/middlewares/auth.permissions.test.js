import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { userCan, requirePermission } from './auth.js';

/** Respuesta de Express falsa, suficiente para saber qué se contestó. */
function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

const conPermisos = (...codes) => ({ id: 1, permissions: new Set(codes) });

describe('userCan', () => {
  it('concede cuando el permiso está', () => {
    assert.equal(userCan(conPermisos('clients.view'), 'clients.view'), true);
  });

  it('niega cuando el permiso no está', () => {
    assert.equal(userCan(conPermisos('clients.view'), 'clients.manage'), false);
  });

  it('falla cerrado sin usuario, sin conjunto de permisos o con uno vacío', () => {
    // Es la comprobación importante: ante cualquier duda, negar. Si esto
    // devolviera true por omisión, una petición sin autenticar pasaría.
    assert.equal(userCan(undefined, 'clients.view'), false);
    assert.equal(userCan(null, 'clients.view'), false);
    assert.equal(userCan({ id: 1 }, 'clients.view'), false);
    assert.equal(userCan(conPermisos(), 'clients.view'), false);
  });

  it('no confunde un permiso con otro que lo tenga como prefijo', () => {
    assert.equal(userCan(conPermisos('appointments.view.own'), 'appointments.view.all'), false);
    assert.equal(userCan(conPermisos('appointments.view'), 'appointments.view.all'), false);
  });
});

describe('requirePermission', () => {
  it('deja pasar cuando tiene el permiso', () => {
    let siguio = false;
    const res = fakeRes();
    requirePermission('clients.view')({ user: conPermisos('clients.view') }, res, () => {
      siguio = true;
    });
    assert.equal(siguio, true);
    assert.equal(res.statusCode, null);
  });

  it('basta con tener uno de los permisos indicados', () => {
    // Caso real: la agenda admite a quien la ve entera y a quien solo ve la suya;
    // el controlador decide después cuántos registros devuelve.
    let siguio = false;
    requirePermission('appointments.view.all', 'appointments.view.own')(
      { user: conPermisos('appointments.view.own') },
      fakeRes(),
      () => {
        siguio = true;
      },
    );
    assert.equal(siguio, true);
  });

  it('responde 403 cuando no tiene ninguno', () => {
    let siguio = false;
    const res = fakeRes();
    requirePermission('payments.view', 'payments.manage')(
      { user: conPermisos('appointments.view.own') },
      res,
      () => {
        siguio = true;
      },
    );
    assert.equal(siguio, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
  });

  it('responde 401 si no hay usuario en la petición', () => {
    let siguio = false;
    const res = fakeRes();
    requirePermission('clients.view')({}, res, () => {
      siguio = true;
    });
    assert.equal(siguio, false);
    assert.equal(res.statusCode, 401);
  });

  it('un rol nuevo sin permisos no entra a ningún sitio', () => {
    // Regresión de la escalada de privilegios: antes, un rol que no fuera
    // 'barber' ni 'client' caía en la rama final y veía la agenda completa.
    const nuevo = conPermisos();
    for (const codigo of ['appointments.view.all', 'clients.view', 'payments.view', 'users.manage']) {
      const res = fakeRes();
      let siguio = false;
      requirePermission(codigo)({ user: nuevo }, res, () => {
        siguio = true;
      });
      assert.equal(siguio, false, `no debería pasar con ${codigo}`);
      assert.equal(res.statusCode, 403);
    }
  });
});
