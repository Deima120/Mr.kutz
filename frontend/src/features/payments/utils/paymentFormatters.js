import { formatAppointmentClockTime } from '@/shared/utils/appointmentTime';

export function formatPaymentAmount(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  if (payment?.payment_type) return payment.payment_type;
  if (payment?.product_id) return 'product';
  if (payment?.appointment_id) return 'service';
  return 'cash';
}

export function getPaymentTypeLabel(type) {
  if (type === 'product') return 'Producto';
  if (type === 'service') return 'Servicio';
  return 'Caja';
}

export function getPaymentConcept(payment) {
  if (payment?.product_name) {
    const qty = payment.product_quantity != null ? ` × ${payment.product_quantity}` : '';
    const sku = payment.product_sku ? ` · ${payment.product_sku}` : '';
    return `${payment.product_name}${sku}${qty}`;
  }
  if (payment?.service_name) return payment.service_name;
  return 'Cobro en caja';
}

export function getPaymentClientName(payment) {
  const name = `${payment?.client_first_name || ''} ${payment?.client_last_name || ''}`.trim();
  return name || '—';
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
