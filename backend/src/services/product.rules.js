function domainError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Precio de venta de producto: entero > 0, o `null` si no se manda (opcional).
 * Igual que `assertServicePrice`: la moneda de este negocio no usa decimales
 * en ningún otro monto del sistema, y el formulario de venta solo admite
 * pesos enteros — un precio con centavos aquí dejaría ese producto imposible
 * de cobrar sin ningún aviso claro de por qué.
 */
export function parsePositiveOptionalMoney(value, label) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw domainError(`${label} debe ser mayor que cero.`);
  }
  if (!Number.isInteger(parsed)) {
    throw domainError(`${label} debe ser un número entero, sin centavos.`);
  }
  return parsed;
}

export function assertNoManualCost(data) {
  if (Object.prototype.hasOwnProperty.call(data, 'costPrice')) {
    throw domainError(
      'El costo promedio no se edita manualmente; se calcula desde las recepciones.'
    );
  }
}

export function assertProductCanDeactivate({ quantity = 0, openOrderCount = 0 }) {
  if (Number(quantity) > 0) {
    throw domainError('No se puede archivar un producto con stock activo.', 409);
  }
  if (Number(openOrderCount) > 0) {
    throw domainError('No se puede archivar un producto incluido en órdenes abiertas.', 409);
  }
}
