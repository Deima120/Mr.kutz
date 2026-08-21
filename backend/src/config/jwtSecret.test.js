import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveJwtSecret, MIN_JWT_SECRET_LENGTH } from './jwtSecret.js';

const VALID = 'x'.repeat(MIN_JWT_SECRET_LENGTH);

test('devuelve el secreto cuando es suficientemente largo', () => {
  assert.equal(resolveJwtSecret({ JWT_SECRET: VALID }), VALID);
});

test('recorta espacios alrededor', () => {
  assert.equal(resolveJwtSecret({ JWT_SECRET: `  ${VALID}  ` }), VALID);
});

test('lanza si falta el secreto — nunca cae a un valor por defecto', () => {
  assert.throws(() => resolveJwtSecret({}), /Falta JWT_SECRET/);
  assert.throws(() => resolveJwtSecret({ JWT_SECRET: '' }), /Falta JWT_SECRET/);
  assert.throws(() => resolveJwtSecret({ JWT_SECRET: '   ' }), /Falta JWT_SECRET/);
});

test('lanza si el secreto es demasiado corto', () => {
  assert.throws(
    () => resolveJwtSecret({ JWT_SECRET: 'corto' }),
    /demasiado corto/
  );
  assert.throws(
    () => resolveJwtSecret({ JWT_SECRET: 'x'.repeat(MIN_JWT_SECRET_LENGTH - 1) }),
    /demasiado corto/
  );
});

test('falla cerrado sin importar NODE_ENV', () => {
  for (const env of ['development', 'test', 'produccion', 'PRODUCTION', undefined]) {
    assert.throws(
      () => resolveJwtSecret({ NODE_ENV: env }),
      /Falta JWT_SECRET/,
      `NODE_ENV=${env} no debe permitir arrancar sin secreto`
    );
  }
});
