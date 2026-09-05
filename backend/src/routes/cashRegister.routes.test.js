import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('rutas cash-registers (admin)', () => {
  it('monta auth + guardia de permisos y los 5 endpoints', () => {
    const source = readFileSync(join(__dirname, 'cashRegister.routes.js'), 'utf8');
    assert.match(source, /router\.use\(auth\)/);
    // Antes esta comprobación buscaba authorize('admin') y pasaba por casualidad:
    // el texto había quedado en un comentario. Ahora comprueba el guardia real.
    assert.match(source, /requirePermission\(\s*'cash_register\.view',\s*'cash_register\.manage'\s*\)/);
    assert.match(source, /router\.get\(\s*['"]\/current['"]/);
    assert.match(source, /router\.get\(\s*['"]\/history['"]/);
    assert.match(source, /router\.post\(\s*['"]\/open['"]/);
    assert.match(source, /router\.post\(\s*['"]\/close['"]/);
    assert.match(source, /router\.get\(\s*['"]\/:id\/summary['"]/);
  });

  it('está montado en /api/cash-registers desde routes/index', () => {
    const source = readFileSync(join(__dirname, 'index.js'), 'utf8');
    assert.match(source, /cashRegisterRoutes/);
    assert.match(source, /router\.use\(\s*['"]\/cash-registers['"]\s*,\s*cashRegisterRoutes\s*\)/);
  });
});
