import { formatAppointmentClockTime } from '@/shared/utils/appointmentTime';
import { formatMoney } from '@/shared/utils/money';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

/** Alias de dominio → helper canónico COP. */
export function formatPaymentAmount(n) {
  return formatMoney(n);
}

export function formatPaymentDate(d) {
  return formatDisplayDate(d);
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
  return 'Venta en caja';
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

export function getPaymentMethodSplits(payment) {
  if (Array.isArray(payment?.methodSplits)) return payment.methodSplits;
  if (Array.isArray(payment?.method_splits)) return payment.method_splits;
  return [];
}

export function isMixedPaymentMethods(payment) {
  if (payment?.isMixedMethods != null) return Boolean(payment.isMixedMethods);
  if (payment?.is_mixed_methods != null) return Boolean(payment.is_mixed_methods);
  return getPaymentMethodSplits(payment).length > 1;
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
  return line.description || 'Venta manual';
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
  mixto: 'Mixto',
};

function formatOneMethodLabel(method) {
  if (!method) return '—';
  const key = String(method).trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] || method;
}

/** Acepta un nombre o compuestos tipo "efectivo + tarjeta". */
export function formatPaymentMethodName(method) {
  if (!method) return '—';
  const raw = String(method).trim();
  if (raw.includes(' + ')) {
    return raw
      .split(' + ')
      .map((part) => formatOneMethodLabel(part.trim()))
      .join(' + ');
  }
  return formatOneMethodLabel(raw);
}

/** Resumen para listado/detalle: "Efectivo $20.000 · Tarjeta $25.000" o nombre simple. */
export function formatPaymentMethodsSummary(payment) {
  const splits = getPaymentMethodSplits(payment);
  if (splits.length > 0) {
    return splits
      .map((split) => {
        const name = formatPaymentMethodName(
          split.paymentMethodName || split.payment_method_name || split.name
        );
        return `${name} ${formatPaymentAmount(split.amount)}`;
      })
      .join(' · ');
  }
  return formatPaymentMethodName(payment?.paymentMethodName || payment?.payment_method_name);
}

export function getPaymentTendered(payment) {
  const v = payment?.amountTendered ?? payment?.amount_tendered;
  return v != null && v !== '' ? Number(v) : null;
}

export function getPaymentChangeGiven(payment) {
  const v = payment?.changeGiven ?? payment?.change_given;
  return v != null && v !== '' ? Number(v) : null;
}

export function isPaymentMethodCash(method) {
  return Boolean(method?.isCash ?? method?.is_cash);
}
