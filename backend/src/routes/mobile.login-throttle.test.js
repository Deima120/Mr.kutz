import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('login móvil con throttle', () => {
  it('monta loginThrottle en POST /api/mobile/auth/login', () => {
    const source = readFileSync(join(__dirname, '../routes/mobile.routes.js'), 'utf8');
    assert.match(source, /loginThrottle/);
    assert.match(source, /router\.post\(\s*['"]\/auth\/login['"]\s*,\s*loginThrottle/);
  });
});
