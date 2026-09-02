/**
 * Ancla del contrato de nombres de persona.
 *
 * La misma regla está espejada en `frontend/src/shared/utils/authValidation.js` y
 * en `mobile_kutz/lib/core/utils/validators.dart` (tres runtimes distintos, uno
 * de ellos en Dart, sin paquete común donde compartirla). Este test fija el
 * comportamiento esperado para que la copia canónica del backend —la única que
 * manda, porque es la del borde HTTP— no derive sin que salte nada.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PERSON_NAME_RE } from './validation.js';

describe('PERSON_NAME_RE', () => {
  it('acepta nombres y apellidos reales del dominio', () => {
    const validos = [
      'Adrian',
      'José',
      'Muñoz',
      'Ana María',       // nombre compuesto con espacio
      'De la Cruz',      // apellido con partículas
      'García-López',    // apellido compuesto con un guion
      "O'Brien",         // apóstrofo
      'Ñoño',
    ];
    for (const v of validos) {
      assert.equal(PERSON_NAME_RE.test(v), true, `debería aceptar ${JSON.stringify(v)}`);
    }
  });

  it('rechaza separadores repetidos, sueltos o en los bordes', () => {
    const invalidos = [
      'ad--rian',   // el caso que motivó la revisión
      "ad''rian",
      'ad  rian',
      '-adrian',
      'adrian-',
      ' adrian',
      'adrian ',
    ];
    for (const v of invalidos) {
      assert.equal(PERSON_NAME_RE.test(v), false, `debería rechazar ${JSON.stringify(v)}`);
    }
  });

  it('rechaza dígitos, símbolos y cadenas vacías', () => {
    const invalidos = ['123', 'adrian1', 'adrian@', 'adrian_lopez', '', '   ', '😀'];
    for (const v of invalidos) {
      assert.equal(PERSON_NAME_RE.test(v), false, `debería rechazar ${JSON.stringify(v)}`);
    }
  });
});
