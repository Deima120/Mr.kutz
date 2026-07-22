/**
 * Helpers de cobro multi-línea (sin Prisma).
 */

import { Prisma } from '@prisma/client';

export const PAYMENT_LINE_TYPES = ['service', 'product', 'manual'];

export function httpPaymentError(message, statusCode = 400, reason = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (reason) err.reason = reason;
  return err;
}

export function toMoneyDecimal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw httpPaymentError('Monto no válido.');
  }
  return new Prisma.Decimal(n.toFixed(2));
}

export function moneyToNumber(value) {
  return Number(value ?? 0);
}

/** Suma lineAmount de líneas activas (centavos enteros). */
export function sumActiveLineAmounts(lines = []) {
  const cents = lines
    .filter((line) => !line.voidedAt)
    .reduce((acc, line) => acc + Math.round(moneyToNumber(line.lineAmount) * 100), 0);
  return cents / 100;
}

export function derivePaymentType(lines = []) {
  const active = lines.filter((line) => !line.voidedAt);
  if (active.length === 0) return 'voided';
  const types = new Set(active.map((line) => line.lineType));
  if (types.size > 1) return 'mixed';
  const only = [...types][0];
  if (only === 'manual') return 'cash';
  return only;
}

/**
 * Normaliza el body de create a un array de líneas tipadas (sin precios resueltos).
 * Requiere `lines[]` (el body legacy de cabecera ya no se acepta).
 */
export function normalizeCreateLineInputs(data = {}) {
  if (Object.prototype.hasOwnProperty.call(data, 'amount') && data.amount != null && data.amount !== '') {
    throw httpPaymentError('El monto del cobro no se envía manualmente; se calcula desde las líneas.');
  }

  const legacyHeader =
    (data.appointmentId != null && data.appointmentId !== '') ||
    (data.productId != null && data.productId !== '') ||
    (data.productQuantity != null && data.productQuantity !== '');
  if (legacyHeader) {
    throw httpPaymentError(
      'El cobro debe enviarse con lines[]. appointmentId/productId en cabecera ya no son válidos.'
    );
  }

  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    throw httpPaymentError('Incluye al menos una línea de cobro en lines[].');
  }
  if (data.lines.length > 100) {
    throw httpPaymentError('Un cobro no puede tener más de 100 líneas.');
  }
  return data.lines.map((raw, index) => normalizeOneLineInput(raw, index));
}

function normalizeOneLineInput(raw, index) {
  const type = String(raw?.type || raw?.lineType || '').trim().toLowerCase();
  if (!PAYMENT_LINE_TYPES.includes(type)) {
    throw httpPaymentError(`Línea ${index + 1}: tipo no válido (service, product o manual).`);
  }

  if (type === 'service') {
    const appointmentId = parseInt(raw.appointmentId, 10);
    if (!Number.isFinite(appointmentId) || appointmentId < 1) {
      throw httpPaymentError(`Línea ${index + 1}: indica una cita válida.`);
    }
    if (raw.productId != null && raw.productId !== '') {
      throw httpPaymentError(`Línea ${index + 1}: una línea de servicio no puede llevar producto.`);
    }
    return { type, appointmentId };
  }

  if (type === 'product') {
    const productId = parseInt(raw.productId, 10);
    const quantity = parseInt(raw.quantity ?? raw.productQuantity, 10);
    if (!Number.isFinite(productId) || productId < 1) {
      throw httpPaymentError(`Línea ${index + 1}: producto no válido.`);
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw httpPaymentError(`Línea ${index + 1}: la cantidad debe ser un entero ≥ 1.`);
    }
    if (raw.appointmentId != null && raw.appointmentId !== '') {
      throw httpPaymentError(`Línea ${index + 1}: una línea de producto no puede llevar cita.`);
    }
    return { type, productId, quantity };
  }

  const unitPrice = Number(raw.unitPrice ?? raw.amount);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw httpPaymentError(`Línea ${index + 1}: el monto manual debe ser mayor a 0.`);
  }
  const description = String(raw.description || '').trim();
  if (!description) {
    throw httpPaymentError(`Línea ${index + 1}: la descripción es obligatoria en líneas manuales.`);
  }
  return {
    type,
    unitPrice,
    description: description.slice(0, 200),
  };
}

export function assertSingleClientForServiceLines(appointmentsById, serviceLines) {
  const clientIds = new Set();
  for (const line of serviceLines) {
    const appt = appointmentsById.get(line.appointmentId);
    if (!appt) continue;
    clientIds.add(appt.clientId);
  }
  if (clientIds.size > 1) {
    throw httpPaymentError('No se pueden mezclar citas de distintos clientes en un mismo cobro.');
  }
  return clientIds.size ? [...clientIds][0] ?? null : null;
}

export function toPaymentLineDto(line) {
  return {
    id: line.id,
    paymentId: line.paymentId,
    lineType: line.lineType,
    appointmentId: line.appointmentId ?? null,
    productId: line.productId ?? null,
    quantity: line.quantity,
    unitPrice: moneyToNumber(line.unitPrice),
    lineAmount: moneyToNumber(line.lineAmount),
    description: line.description ?? null,
    voidedAt: line.voidedAt ?? null,
    voidReason: line.voidReason ?? null,
    voidedBy: line.voidedBy ?? null,
    createdAt: line.createdAt,
    productName: line.product?.name ?? null,
    productSku: line.product?.sku ?? null,
    serviceName: line.appointment?.service?.name ?? null,
    appointmentDate: line.appointment?.appointmentDate ?? null,
    clientFirstName: line.appointment?.client?.firstName ?? null,
    clientLastName: line.appointment?.client?.lastName ?? null,
  };
}
