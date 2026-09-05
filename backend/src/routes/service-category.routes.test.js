import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const leer = (f) => readFileSync(join(__dirname, f), 'utf8');

describe('rutas de categorías de servicio', () => {
  it('exige autenticación y el permiso de gestión', () => {
    const source = leer('service-category.routes.js');
    assert.match(source, /router\.use\(auth\)/);
    assert.match(source, /requirePermission\('service_categories\.manage'\)/);
  });

  it('expone el CRUD completo', () => {
    const source = leer('service-category.routes.js');
    // `\s*` porque varias rutas están escritas en varias líneas, con el path en
    // la línea siguiente a la llamada.
    for (const patron of [
      /router\.get\(\s*'\/'/,
      /router\.get\(\s*'\/:id'/,
      /router\.post\(\s*'\/'/,
      /router\.put\(\s*'\/:id'/,
      /router\.delete\(\s*'\/:id'/,
    ]) {
      assert.match(source, patron);
    }
  });

  it('va bajo su propio prefijo y no colgando de /services', () => {
    // En service.routes.js conviven GET /services/:id y GET /services/categories,
    // y eso solo funciona por el orden de declaración. Colgar aquí un CRUD entero
    // sería frágil.
    const source = leer('index.js');
    assert.match(source, /serviceCategoryRoutes/);
    assert.match(source, /router\.use\(\s*'\/service-categories'\s*,\s*serviceCategoryRoutes\s*\)/);
  });
});
