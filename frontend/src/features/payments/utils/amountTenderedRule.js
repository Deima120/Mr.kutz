/**
 * Regla del efectivo recibido en una venta.
 *
 * Vive aquí, junto al resto de utilidades puras de pagos, para poder probarla con
 * `node --test`: los tests del proyecto no resuelven el alias `@/`, y
 * `shared/utils/formValidation.js` sí lo usa. Por eso `money.js` se importa por
 * ruta relativa —es un módulo sin dependencias— en lugar del alias habitual.
 *
 * `formValidation.validateAmountTendered` delega en esta función, así que la
 * validación en vivo del formulario y la del envío no pueden discrepar.
 */

// Con extensión .js explícita: node --test la exige para rutas relativas.
import { parseMoneyInput } from '../../../shared/utils/money.js';

export const TENDERED_BELOW_CASH =
  'El monto recibido no puede ser menor que la porción en efectivo.';
export const TENDERED_WITHOUT_CASH =
  'Recibido/vuelto solo aplica cuando hay efectivo.';
export const TENDERED_INVALID = 'Indica un monto recibido válido.';

/**
 * @param {object} params
 * @param {string|number} params.amountTendered lo que entrega el cliente
 * @param {number} params.cashAmount porción de la venta asignada a efectivo
 * @returns {{ valid: boolean, message: string }}
 */
export function checkAmountTendered({ amountTendered, cashAmount } = {}) {
  const cashCents = Math.round(Number(cashAmount || 0) * 100);
  const provided = amountTendered != null && String(amountTendered).trim() !== '';

  if (!Number.isFinite(cashCents) || cashCents <= 0) {
    return provided
      ? { valid: false, message: TENDERED_WITHOUT_CASH }
      : { valid: true, message: '' };
  }

  // Vacío es válido: se asume pago exacto.
  if (!provided) return { valid: true, message: '' };

  const tendered = parseMoneyInput(amountTendered);
  if (!Number.isFinite(tendered) || tendered <= 0) {
    return { valid: false, message: TENDERED_INVALID };
  }

  if (Math.round(tendered * 100) < cashCents) {
    return { valid: false, message: TENDERED_BELOW_CASH };
  }

  return { valid: true, message: '' };
}
