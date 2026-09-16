/**
 * Ancla de los límites revisados a pedido del propietario: el teléfono pasa a
 * ser obligatorio (antes solo existía la variante opcional) y el nombre/documento
 * dejan de aceptar longitudes irreales (100 y 20 caracteres respectivamente,
 * que permitían pegar basura como "Emanuelggggggggggggggggggggggggggggggggggggggg").
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validationResult } from 'express-validator';
import { phoneField, personNameField, documentNumberField } from './validation.js';

async function runChain(chain, body) {
  const req = { body, cookies: {}, headers: {}, params: {}, query: {} };
  await chain.run(req);
  return validationResult(req)
    .array()
    .map((e) => e.msg);
}

describe('phoneField (teléfono obligatorio)', () => {
  it('rechaza el teléfono ausente o vacío', async () => {
    const errors = await runChain(phoneField('phone'), {});
    assert.ok(errors.includes('El teléfono es obligatorio.'));
  });

  it('rechaza dígitos fuera de rango (menos de 7 o más de 15)', async () => {
    const corto = await runChain(phoneField('phone'), { phone: '123456' });
    assert.ok(corto.includes('El teléfono debe tener entre 7 y 15 dígitos.'));

    const largo = await runChain(phoneField('phone'), { phone: '1234567890123456' });
    assert.ok(largo.includes('El teléfono debe tener entre 7 y 15 dígitos.'));
  });

  it('rechaza caracteres que no sean dígitos', async () => {
    const errors = await runChain(phoneField('phone'), { phone: '300-123-4567' });
    assert.ok(errors.includes('El teléfono solo puede contener dígitos.'));
  });

  it('acepta un teléfono válido', async () => {
    const errors = await runChain(phoneField('phone'), { phone: '3001234567' });
    assert.deepEqual(errors, []);
  });
});

describe('personNameField (tope real de 50 caracteres)', () => {
  it('rechaza un nombre de 51 caracteres, aunque solo tenga letras', async () => {
    // Caso real reportado: "Emanuelgggg...g" pasaba porque el tope viejo era 100.
    const nombreLargo = 'a'.repeat(51);
    const errors = await runChain(personNameField('firstName', 'El nombre'), {
      firstName: nombreLargo,
    });
    assert.ok(errors.includes('El nombre debe tener entre 2 y 50 caracteres.'));
  });

  it('acepta un nombre real de hasta 50 caracteres', async () => {
    const nombre = 'a'.repeat(50);
    const errors = await runChain(personNameField('firstName', 'El nombre'), {
      firstName: nombre,
    });
    assert.deepEqual(errors, []);
  });
});

describe('documentNumberField (tope real de 10 dígitos)', () => {
  it('rechaza un documento de 11 dígitos', async () => {
    const errors = await runChain(documentNumberField('documentNumber'), {
      documentNumber: '12345678901',
    });
    assert.ok(errors.includes('El número de documento debe tener entre 5 y 10 dígitos.'));
  });

  it('acepta un documento de 10 dígitos', async () => {
    const errors = await runChain(documentNumberField('documentNumber'), {
      documentNumber: '1234567890',
    });
    assert.deepEqual(errors, []);
  });
});
