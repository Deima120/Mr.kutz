/**
 * Precio de servicio: entero > 0 (nunca inventar 0). La moneda de este
 * negocio (COP) no usa decimales en ningún otro monto del sistema — el
 * propio formulario de venta solo admite pesos enteros y rechaza el cobro si
 * la suma no cuadra EXACTA en centavos, así que un precio con centavos aquí
 * dejaría ese servicio imposible de cobrar sin ningún aviso claro de por qué.
 */
export function assertServicePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    const err = new Error('El precio debe ser mayor a 0.');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isInteger(price)) {
    const err = new Error('El precio debe ser un número entero, sin centavos.');
    err.statusCode = 400;
    throw err;
  }
  return price;
}
