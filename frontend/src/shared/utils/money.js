/**
 * Formato de dinero canónico (COP estilo es-CO, 2 decimales).
 * Usar en pagos, dashboard, reportes y exports de ingresos.
 */
export function formatMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
