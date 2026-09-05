import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERMISSIONS,
  PERMISSION_CODES,
  ROLE_PRESETS,
  ROLES,
  MODULE_LABELS,
  assertPresetsAreValid,
} from './permissions.js';

describe('catálogo de permisos', () => {
  it('no tiene códigos repetidos', () => {
    assert.equal(new Set(PERMISSION_CODES).size, PERMISSION_CODES.length);
  });

  it('todos los códigos siguen la forma modulo.accion', () => {
    for (const p of PERMISSIONS) {
      assert.match(p.code, /^[a-z_]+\.[a-z_.]+$/, `código con forma rara: ${p.code}`);
      assert.ok(p.code.startsWith(`${p.module}.`), `${p.code} no empieza por su módulo ${p.module}`);
    }
  });

  it('todos los módulos tienen etiqueta legible para la pantalla de roles', () => {
    for (const p of PERMISSIONS) {
      assert.ok(MODULE_LABELS[p.module], `falta etiqueta del módulo ${p.module}`);
    }
  });

  it('todo permiso tiene descripción: la pantalla muestra el texto, no el código', () => {
    for (const p of PERMISSIONS) {
      assert.ok(p.description && p.description.length > 0, `${p.code} sin descripción`);
    }
  });

  it('ningún preset cita un permiso inexistente', () => {
    assert.equal(assertPresetsAreValid(), true);
  });
});

describe('permisos de fábrica de cada rol', () => {
  // Estas comprobaciones son la red que impide cambiar sin querer quién puede
  // qué. Reproducen el acceso que tenía cada rol ANTES del módulo de permisos.

  it('admin lo tiene todo', () => {
    assert.deepEqual([...ROLE_PRESETS[ROLES.ADMIN]].sort(), [...PERMISSION_CODES].sort());
  });

  it('barbero ve solo sus citas y nunca la agenda completa', () => {
    const barbero = ROLE_PRESETS[ROLES.BARBER];
    assert.ok(barbero.includes('appointments.view.own'));
    assert.ok(!barbero.includes('appointments.view.all'));
  });

  it('barbero conserva la gestión de servicios que ya tenía', () => {
    // Rareza heredada, conservada a propósito: service.routes.js protegía la
    // escritura con authorize('admin', 'barber').
    assert.ok(ROLE_PRESETS[ROLES.BARBER].includes('services.manage'));
  });

  it('barbero ve su propio resumen diario, no el panel del negocio', () => {
    const barbero = ROLE_PRESETS[ROLES.BARBER];
    assert.ok(barbero.includes('dashboard.view.own'));
    assert.ok(!barbero.includes('dashboard.view.all'));
  });

  it('cliente puede agendar y valorar, pero no ve la agenda completa', () => {
    const cliente = ROLE_PRESETS[ROLES.CLIENT];
    assert.ok(cliente.includes('appointments.create'));
    assert.ok(cliente.includes('appointments.rate'));
    assert.ok(cliente.includes('appointments.view.own'));
    assert.ok(!cliente.includes('appointments.view.all'));
  });

  it('cliente puede listar barberos porque lo necesita para reservar', () => {
    assert.ok(ROLE_PRESETS[ROLES.CLIENT].includes('barbers.view'));
  });

  it('ni barbero ni cliente tocan dinero, usuarios ni roles', () => {
    const prohibidos = [
      'payments.view', 'payments.manage',
      'purchases.view', 'purchases.manage',
      'expenses.view', 'cash_register.view',
      'clients.view', 'clients.manage',
      'users.view', 'users.manage',
      'roles.view', 'roles.manage',
    ];
    for (const rol of [ROLES.BARBER, ROLES.CLIENT]) {
      for (const codigo of prohibidos) {
        assert.ok(
          !ROLE_PRESETS[rol].includes(codigo),
          `el rol ${rol} no debería tener ${codigo}`,
        );
      }
    }
  });

  it('solo admin puede gestionar usuarios: es la salvaguarda del último administrador', () => {
    const conGestion = Object.entries(ROLE_PRESETS)
      .filter(([, codigos]) => codigos.includes('users.manage'))
      .map(([rol]) => rol);
    assert.deepEqual(conGestion, [ROLES.ADMIN]);
  });
});
