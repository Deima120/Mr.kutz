import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('rutas commissions (permiso commissions)', () => {
  it('monta auth + guardia de permisos y GET /', () => {
    const source = readFileSync(join(__dirname, 'commission.routes.js'), 'utf8');
    assert.match(source, /router\.use\(auth\)/);
    // El guardia ya no es por rol sino por permiso: entrar exige poder consultar,
    // y escribir exige poder gestionar.
    assert.match(source, /requirePermission\(\s*'commissions\.view',\s*'commissions\.manage'\s*\)/);
    assert.match(source, /requirePermission\(\s*'commissions\.manage'\s*\)/);
    assert.match(source, /router\.get\(\s*['"]\/['"]/);
  });

  it('está montado en /api/commissions desde routes/index', () => {
    const source = readFileSync(join(__dirname, 'index.js'), 'utf8');
    assert.match(source, /commissionRoutes/);
    assert.match(source, /router\.use\(\s*['"]\/commissions['"]\s*,\s*commissionRoutes\s*\)/);
  });
});

describe('rutas portfolio (permiso portfolio)', () => {
  it('monta auth + guardia de permisos y GET /', () => {
    const source = readFileSync(join(__dirname, 'portfolio.routes.js'), 'utf8');
    assert.match(source, /router\.use\(auth\)/);
    assert.match(source, /requirePermission\(\s*'portfolio\.manage'\s*\)/);
    assert.match(source, /router\.get\(\s*['"]\/['"]/);
  });

  it('está montado en /api/portfolio desde routes/index', () => {
    const source = readFileSync(join(__dirname, 'index.js'), 'utf8');
    assert.match(source, /portfolioRoutes/);
    assert.match(source, /router\.use\(\s*['"]\/portfolio['"]\s*,\s*portfolioRoutes\s*\)/);
  });
});
