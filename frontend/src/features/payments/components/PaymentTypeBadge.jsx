import { getPaymentType, getPaymentTypeLabel } from '@/features/payments/utils/paymentFormatters';

const STYLES = {
  service: 'border-sky-200 bg-sky-50 text-sky-800',
  product: 'border-violet-200 bg-violet-50 text-violet-800',
  cash: 'border-stone-200 bg-stone-100 text-stone-700',
};

export default function PaymentTypeBadge({ payment }) {
  const type = getPaymentType(payment);
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${STYLES[type] || STYLES.cash}`}
    >
      {getPaymentTypeLabel(type)}
    </span>
  );
}
