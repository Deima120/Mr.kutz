import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loginThrottle,
  registerFailedLogin,
  clearLoginAttempts,
  __testing,
} from './loginThrottle.js';

/** Mínimo para ejercitar el middleware sin levantar Express. */
function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function attempt(email, ip) {
  const req = { body: { email }, ip };
  const res = makeRes();
  let passed = false;
  loginThrottle(req, res, () => {
    passed = true;
  });
  return { req, res, passed };
}

test.beforeEach(() => __testing.reset());

test('bloquea tras MAX_ATTEMPTS fallos contra la misma cuenta', () => {
  const email = 'v@gmail.com';
  for (let i = 0; i < __testing.MAX_ATTEMPTS; i += 1) {
    const { req, passed } = attempt(email, '1.1.1.1');
    assert.equal(passed, true, `intento ${i + 1} debia pasar`);
    registerFailedLogin(req);
  }
  const { passed, res } = attempt(email, '1.1.1.1');
  assert.equal(passed, false);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.reason, 'LOGIN_LOCKED');
});

test('password spraying: bloquea por IP aunque el email cambie siempre', () => {
  const ip = '9.9.9.9';
  for (let i = 0; i < __testing.MAX_IP_ATTEMPTS; i += 1) {
    const { req, passed } = attempt(`victima${i}@gmail.com`, ip);
    assert.equal(passed, true, `intento ${i + 1} debia pasar`);
    registerFailedLogin(req);
  }
  // Antes esto seguía indefinidamente: la clave era email|ip y nunca se repetía.
  const { passed, res } = attempt('otra-mas@gmail.com', ip);
  assert.equal(passed, false);
  assert.equal(res.statusCode, 429);
});

test('el bloqueo por IP no afecta a otra IP', () => {
  const ip = '9.9.9.9';
  for (let i = 0; i < __testing.MAX_IP_ATTEMPTS; i += 1) {
    const { req } = attempt(`v${i}@gmail.com`, ip);
    registerFailedLogin(req);
  }
  const { passed } = attempt('alguien@gmail.com', '2.2.2.2');
  assert.equal(passed, true);
});

test('un login correcto limpia la cuenta pero NO el contador de la IP', () => {
  const ip = '5.5.5.5';
  for (let i = 0; i < __testing.MAX_IP_ATTEMPTS - 1; i += 1) {
    const { req } = attempt(`v${i}@gmail.com`, ip);
    registerFailedLogin(req);
  }
  // Acertar una cuenta no debe servir para reiniciar el spraying.
  const ok = attempt('acertada@gmail.com', ip);
  clearLoginAttempts(ok.req);

  const { req } = attempt('siguiente@gmail.com', ip);
  registerFailedLogin(req);
  const { passed } = attempt('otra@gmail.com', ip);
  assert.equal(passed, false);
});

test('sin email el middleware no interviene', () => {
  const req = { body: {}, ip: '1.2.3.4' };
  let passed = false;
  loginThrottle(req, makeRes(), () => {
    passed = true;
  });
  assert.equal(passed, true);
});

test('el barrido descarta entradas vencidas y evita el crecimiento sin cota', () => {
  for (let i = 0; i < 50; i += 1) {
    const { req } = attempt(`v${i}@gmail.com`, `10.0.0.${i}`);
    registerFailedLogin(req);
  }
  assert.ok(__testing.sizes().attempts >= 50);

  // Barrer "en el futuro": toda ventana ya vencida.
  const futuro = Date.now() + __testing.WINDOW_MS * 2;
  __testing.sweep(futuro);

  assert.equal(__testing.sizes().attempts, 0);
  assert.equal(__testing.sizes().ipAttempts, 0);
});

test('el barrido conserva las entradas aun bloqueadas', () => {
  const ip = '7.7.7.7';
  for (let i = 0; i < __testing.MAX_ATTEMPTS; i += 1) {
    const { req } = attempt('v@gmail.com', ip);
    registerFailedLogin(req);
  }
  // Vencida la ventana pero todavía dentro del bloqueo: no debe descartarse.
  __testing.sweep(Date.now() + __testing.WINDOW_MS + 1000);
  const { passed } = attempt('v@gmail.com', ip);
  assert.equal(passed, false);
});
