function domainError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function parsePositiveOptionalMoney(value, label) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw domainError(`${label} debe ser mayor que cero.`);
  }
  return Number(parsed.toFixed(2));
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
