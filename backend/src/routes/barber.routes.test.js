import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leer = (f) => readFileSync(join(__dirname, f), 'utf8');

describe('rutas de barberos — cambio de rol y contraseña', () => {
  it('/:id/role exige barbers.manage y users.manage', () => {
    const source = leer('barber.routes.js');
    const bloque = source.match(/router\.patch\(\s*'\/:id\/role'[\s\S]*?\);/);
    assert.ok(bloque, 'se esperaba una ruta PATCH /:id/role');
    assert.match(bloque[0], /requirePermission\('barbers\.manage'\)/);
    assert.match(bloque[0], /requirePermission\('users\.manage'\)/);
  });

  it('/:id/password exige barbers.manage y users.manage, y valida contraseña fuerte', () => {
    const source = leer('barber.routes.js');
    const bloque = source.match(/router\.patch\(\s*'\/:id\/password'[\s\S]*?\);/);
    assert.ok(bloque, 'se esperaba una ruta PATCH /:id/password');
    assert.match(bloque[0], /requirePermission\('barbers\.manage'\)/);
    assert.match(bloque[0], /requirePermission\('users\.manage'\)/);
    assert.match(bloque[0], /strongPassword\('password'\)/);
  });
});
