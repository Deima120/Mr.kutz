/** Precio de servicio: debe ser un número finito > 0 (nunca inventar 0). */
export function assertServicePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    const err = new Error('El precio debe ser mayor a 0.');
    err.statusCode = 400;
    throw err;
  }
  return price;
}
