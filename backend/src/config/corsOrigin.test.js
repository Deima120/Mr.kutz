import test from 'node:test';
import assert from 'node:assert/strict';

import { createOriginChecker } from './corsOrigin.js';

const PROD = {
  allowedOrigins: ['https://app.mrkutz.com'],
  envOrigins: ['https://www.mrkutz.com'],
  isProduction: true,
};

test('acepta los origenes configurados', () => {
  const allowed = createOriginChecker(PROD);
  assert.equal(allowed('https://app.mrkutz.com'), true);
  assert.equal(allowed('https://www.mrkutz.com'), true);
});

test('rechaza dominios que solo CONTIENEN localhost', () => {
  const allowed = createOriginChecker(PROD);
  // El filtro anterior usaba includes('localhost') y dejaba pasar todos estos.
  assert.equal(allowed('https://localhost.attacker.com'), false);
  assert.equal(allowed('https://mi-localhost.com'), false);
  assert.equal(allowed('https://localhost-evil.io'), false);
  assert.equal(allowed('https://evil.com/?x=127.0.0.1'), false);
  assert.equal(allowed('https://127.0.0.1.attacker.com'), false);
});

test('en produccion NO se permite localhost real', () => {
  const allowed = createOriginChecker(PROD);
  assert.equal(allowed('http://localhost:5173'), false);
  assert.equal(allowed('http://127.0.0.1:3000'), false);
});

test('fuera de produccion si se permite localhost real', () => {
  const allowed = createOriginChecker({ ...PROD, isProduction: false });
  assert.equal(allowed('http://localhost:5173'), true);
  assert.equal(allowed('http://127.0.0.1:3000'), true);
  // pero el impostor sigue rechazado
  assert.equal(allowed('https://localhost.attacker.com'), false);
});

test('previews solo si se habilitan y solo en los hosts esperados', () => {
  const sin = createOriginChecker(PROD);
  assert.equal(sin('https://mrkutz-abc123.vercel.app'), false);

  const con = createOriginChecker({ ...PROD, allowPreviews: true });
  assert.equal(con('https://mrkutz-abc123.vercel.app'), true);
  assert.equal(con('https://mrkutz.netlify.app'), true);
  // sufijo falsificado
  assert.equal(con('https://vercel.app.attacker.com'), false);
  assert.equal(con('https://evil.com/vercel.app'), false);
});

test('sin cabecera Origin se permite (apps nativas, curl, health checks)', () => {
  const allowed = createOriginChecker(PROD);
  assert.equal(allowed(undefined), true);
  assert.equal(allowed(''), true);
});

test('origen no parseable se rechaza', () => {
  const allowed = createOriginChecker(PROD);
  assert.equal(allowed('no-es-una-url'), false);
  assert.equal(allowed('://'), false);
});
