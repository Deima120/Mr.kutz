import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAllowedEmailDomain,
  ALLOWED_EMAIL_DOMAINS,
} from './allowedEmailDomains.js';

test('acepta los proveedores permitidos', () => {
  for (const domain of ALLOWED_EMAIL_DOMAINS) {
    assert.equal(isAllowedEmailDomain(`usuario@${domain}`), true, domain);
  }
});

test('rechaza dominios inventados o sin TLD', () => {
  const rejected = [
    'usuario@verga',
    'usuario@bruto',
    'usuario@algo',
    'usuario@dominioinventado.com',
    'usuario@gmail',
    'usuario@outlook',
    'usuario@empresa.com.co',
  ];
  for (const email of rejected) {
    assert.equal(isAllowedEmailDomain(email), false, email);
  }
});

test('rechaza subdominios y sufijos parecidos', () => {
  const lookalikes = [
    'usuario@gmail.fake.com',
    'usuario@gmail.com.fake',
    'usuario@mail.gmail.com',
    'usuario@notgmail.com',
    'usuario@gmail.com.co',
    'usuario@hotmail.com.mx',
  ];
  for (const email of lookalikes) {
    assert.equal(isAllowedEmailDomain(email), false, email);
  }
});

test('normaliza mayusculas y espacios alrededor', () => {
  assert.equal(isAllowedEmailDomain('  Usuario@Gmail.COM  '), true);
  assert.equal(isAllowedEmailDomain('USUARIO@HOTMAIL.COM'), true);
  assert.equal(isAllowedEmailDomain('\tusuario@proton.me\n'), true);
});

test('exige exactamente un @ y una parte local no vacia', () => {
  const malformed = [
    'usuario',
    'usuario.gmail.com',
    '@gmail.com',
    'usuario@@gmail.com',
    'usuario@gmail.com@gmail.com',
    'usuario@',
    '',
    '   ',
  ];
  for (const email of malformed) {
    assert.equal(isAllowedEmailDomain(email), false, JSON.stringify(email));
  }
});

test('no revienta con valores nulos o de otro tipo', () => {
  assert.equal(isAllowedEmailDomain(null), false);
  assert.equal(isAllowedEmailDomain(undefined), false);
  assert.equal(isAllowedEmailDomain(12345), false);
  assert.equal(isAllowedEmailDomain({}), false);
});
