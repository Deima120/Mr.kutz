import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leer = (f) => readFileSync(join(__dirname, f), 'utf8');

describe('rutas de clientes — cambio de rol', () => {
  it('/:id/role exige users.manage además del guardia de escritura del router', () => {
    const source = leer('client.routes.js');
    const bloque = source.match(/router\.patch\(\s*'\/:id\/role'[\s\S]*?\);/);
    assert.ok(bloque, 'se esperaba una ruta PATCH /:id/role');
    assert.match(bloque[0], /requirePermission\('users\.manage'\)/);
  });

  it('/:id/role se declara después del guardia general de escritura (clients.manage)', () => {
    const source = leer('client.routes.js');
    const idxGuardiaEscritura = source.indexOf("requirePermission('clients.manage')(req, res, next)");
    const idxRuta = source.search(/router\.patch\(\s*'\/:id\/role'/);
    assert.ok(idxGuardiaEscritura >= 0 && idxRuta >= 0);
    assert.ok(idxRuta > idxGuardiaEscritura);
  });
});
