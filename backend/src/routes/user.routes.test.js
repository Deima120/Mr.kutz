import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leer = (f) => readFileSync(join(__dirname, f), 'utf8');

describe('rutas de usuarios', () => {
  it('exige autenticación y separa consulta de gestión', () => {
    const source = leer('user.routes.js');
    assert.match(source, /router\.use\(auth\)/);
    assert.match(source, /requirePermission\('users\.view', 'users\.manage'\)/);
    assert.match(source, /requirePermission\('users\.manage'\)/);
  });

  it('toda ruta de escritura pasa por el guardia de gestión', () => {
    const source = leer('user.routes.js');
    // Cada post/patch/delete debe llevar `manage` como primer middleware. Si
    // alguien añade una ruta nueva y lo olvida, cualquiera con users.view podría
    // escribir.
    const escrituras = source.match(/router\.(post|patch|delete)\([\s\S]*?\);/g) ?? [];
    assert.ok(escrituras.length >= 5, 'se esperaban al menos 5 rutas de escritura');
    for (const bloque of escrituras) {
      assert.ok(
        bloque.includes('manage'),
        `ruta de escritura sin guardia de gestión:\n${bloque.slice(0, 90)}`,
      );
    }
  });

  it('la contraseña del alta pasa por la validación de contraseña fuerte', () => {
    const source = leer('user.routes.js');
    assert.match(source, /strongPassword\('password'\)/);
  });

  it('está montado en /api/users', () => {
    const source = leer('index.js');
    assert.match(source, /userRoutes/);
    assert.match(source, /router\.use\(\s*'\/users'\s*,\s*userRoutes\s*\)/);
  });
});

describe('rutas de roles', () => {
  it('exige autenticación y separa consulta de gestión', () => {
    const source = leer('role.routes.js');
    assert.match(source, /router\.use\(auth\)/);
    assert.match(source, /requirePermission\('roles\.view', 'roles\.manage'\)/);
    assert.match(source, /requirePermission\('roles\.manage'\)/);
  });

  it('declara /permissions antes que /:id', () => {
    // Si se declarara después, Express interpretaría "permissions" como un id y
    // la validación devolvería 400.
    const source = leer('role.routes.js');
    assert.ok(
      source.indexOf("router.get('/permissions'") < source.indexOf("router.get('/:id'"),
      '/permissions debe declararse antes que /:id',
    );
  });

  it('está montado en /api/roles', () => {
    const source = leer('index.js');
    assert.match(source, /roleRoutes/);
    assert.match(source, /router\.use\(\s*'\/roles'\s*,\s*roleRoutes\s*\)/);
  });
});
