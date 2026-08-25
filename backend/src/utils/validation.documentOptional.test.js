/**
 * Regresión: un PUT parcial de barbero (solo `isActive`, desde la píldora
 * Activo/Inactivo de la tarjeta) fallaba con 400 «El tipo de documento es
 * obligatorio.» porque `updateValidation` usaba los validadores estrictos.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validationResult } from 'express-validator';
import {
  documentTypeField,
  optionalDocumentTypeField,
  optionalDocumentNumberField,
} from './validation.js';

/** Ejecuta una cadena de express-validator sobre un body y devuelve los mensajes. */
async function runChain(chain, body) {
  const req = { body, cookies: {}, headers: {}, params: {}, query: {} };
  await chain.run(req);
  return validationResult(req)
    .array()
    .map((e) => e.msg);
}

describe('validadores de documento opcionales (actualización parcial)', () => {
  it('el validador ESTRICTO sí exige el tipo de documento (comportamiento de alta)', async () => {
    const errors = await runChain(documentTypeField('documentType'), { isActive: false });
    // La cadena estricta acumula los dos mensajes (notEmpty + isIn); basta comprobar
    // que el de obligatoriedad esta presente, que es el que veia el usuario.
    assert.ok(errors.includes('El tipo de documento es obligatorio.'));
  });

  it('el opcional deja pasar un body que no trae documento', async () => {
    const errors = await runChain(optionalDocumentTypeField('documentType'), { isActive: false });
    assert.deepEqual(errors, []);
  });

  it('el opcional deja pasar el número de documento ausente', async () => {
    const errors = await runChain(optionalDocumentNumberField('documentNumber'), {
      isActive: false,
    });
    assert.deepEqual(errors, []);
  });

  it('el opcional sigue rechazando un tipo de documento inválido si se envía', async () => {
    const errors = await runChain(optionalDocumentTypeField('documentType'), {
      documentType: 'PASAPORTE_FALSO',
    });
    assert.deepEqual(errors, ['Selecciona un tipo de documento válido.']);
  });

  it('el opcional sigue rechazando un número de documento no numérico', async () => {
    const errors = await runChain(optionalDocumentNumberField('documentNumber'), {
      documentNumber: 'ABC123',
    });
    assert.ok(errors.includes('El número de documento solo puede contener dígitos.'));
  });
});
