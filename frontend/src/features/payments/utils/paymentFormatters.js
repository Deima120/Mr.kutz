import { formatAppointmentClockTime } from '@/shared/utils/appointmentTime';
import { formatMoney } from '@/shared/utils/money';

export function formatPaymentAmount(n) {
  return formatMoney(n);
}

export function formatPaymentDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPaymentDateTime(d, time) {
  const date = formatPaymentDate(d);
  const clock = formatAppointmentClockTime(time);
  return clock ? `${date} · ${clock}` : date;
}

export function getPaymentType(payment) {
  if (payment?.paymentType) return payment.paymentType;
  if (payment?.payment_type) return payment.payment_type;
  if (payment?.product_id || payment?.productId) return 'product';
  if (payment?.appointment_id || payment?.appointmentId) return 'service';
  return 'cash';
}

export function getPaymentTypeLabel(type) {
  if (type === 'product') return 'Producto';
  if (type === 'service') return 'Servicio';
  if (type === 'mixed') return 'Mixto';
  if (type === 'voided') return 'Anulado';
  return 'Caja';
}

export function getPaymentConcept(payment) {
  if (payment?.concept) return payment.concept;
  if (payment?.product_name || payment?.productName) {
    const name = payment.product_name || payment.productName;
    const qty = payment.product_quantity ?? payment.productQuantity;
    const sku = payment.product_sku || payment.productSku;
    const qtyPart = qty != null ? ` × ${qty}` : '';
    const skuPart = sku ? ` · ${sku}` : '';
    return `${name}${skuPart}${qtyPart}`;
  }
  if (payment?.service_name || payment?.serviceName) {
    return payment.service_name || payment.serviceName;
  }
  return 'Cobro en caja';
}

export function getPaymentClientName(payment) {
  const name = `${payment?.client_first_name || payment?.clientFirstName || ''} ${
    payment?.client_last_name || payment?.clientLastName || ''
  }`.trim();
  return name || '—';
}

export function getPaymentLines(payment) {
  return Array.isArray(payment?.lines) ? payment.lines : [];
}

export function getLineLabel(line) {
  if (!line) return '—';
  if (line.lineType === 'product' || line.type === 'product') {
    const name = line.productName || line.description || 'Producto';
    const qty = line.quantity != null ? ` × ${line.quantity}` : '';
    return `${name}${qty}`;
  }
  if (line.lineType === 'service' || line.type === 'service') {
    return line.serviceName || line.description || 'Servicio';
  }
  return line.description || 'Cobro manual';
}

export function isPaymentVoided(payment) {
  return Boolean(payment?.voidedAt || payment?.voided_at);
}

export function isLineVoided(line) {
  return Boolean(line?.voidedAt || line?.voided_at);
}

const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
};

export function formatPaymentMethodName(method) {
  if (!method) return '—';
  const key = String(method).toLowerCase();
  return PAYMENT_METHOD_LABELS[key] || method;
}
