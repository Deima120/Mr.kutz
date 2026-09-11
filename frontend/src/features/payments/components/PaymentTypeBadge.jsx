import { getPaymentType, getPaymentTypeLabel } from '@/features/payments/utils/paymentFormatters';

const STYLES = {
  service: 'border-sky-200 bg-sky-50 text-sky-800',
  product: 'border-violet-200 bg-violet-50 text-violet-800',
  cash: 'border-stone-200 bg-stone-100 text-stone-700',
  mixed: 'border-amber-200 bg-amber-50 text-amber-900',
};

export default function PaymentTypeBadge({ payment }) {
  const type = getPaymentType(payment);
  return (
    // Misma cápsula que el badge de estado de la fila: los dos van en la misma
    // tabla y tenían formas y tamaños distintos.
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[type] || STYLES.cash}`}
    >
      {getPaymentTypeLabel(type)}
    </span>
  );
}
