import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_NAME_MAX,
  CLIENT_DOCUMENT_MAX_DIGITS,
  validatePersonName,
  validateDocumentNumber,
  sanitizeDocumentNumber,
} from './authValidation.js';

describe('validatePersonName (tope real de 50 caracteres)', () => {
  it('rechaza un nombre de 51 caracteres, aunque solo tenga letras', () => {
    // Caso real reportado: "Emanuelgggg...g" pasaba porque el tope viejo era 100.
    const nombreLargo = 'a'.repeat(CLIENT_NAME_MAX + 1);
    const result = validatePersonName(nombreLargo, 'El nombre');
    assert.equal(result.valid, false);
  });

  it('acepta un nombre real de hasta 50 caracteres', () => {
    const nombre = 'a'.repeat(CLIENT_NAME_MAX);
    const result = validatePersonName(nombre, 'El nombre');
    assert.equal(result.valid, true);
  });
});

describe('validateDocumentNumber (tope real de 10 dígitos)', () => {
  it('sanitizeDocumentNumber trunca a 10 dígitos, aunque se pegue un valor más largo', () => {
    const pegado = '1'.repeat(CLIENT_DOCUMENT_MAX_DIGITS + 5);
    assert.equal(sanitizeDocumentNumber(pegado).length, CLIENT_DOCUMENT_MAX_DIGITS);
  });

  it('acepta un documento de 10 dígitos', () => {
    const result = validateDocumentNumber('1'.repeat(CLIENT_DOCUMENT_MAX_DIGITS));
    assert.equal(result.valid, true);
  });

  it('rechaza un documento de menos de 5 dígitos', () => {
    const result = validateDocumentNumber('123');
    assert.equal(result.valid, false);
  });
});
