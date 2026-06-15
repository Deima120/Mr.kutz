import { X } from 'lucide-react';
import PaymentTypeBadge from '@/features/payments/components/PaymentTypeBadge';
import {
  formatPaymentAmount,
  formatPaymentDateTime,
  formatPaymentMethodName,
  getPaymentClientName,
  getPaymentConcept,
} from '@/features/payments/utils/paymentFormatters';

function DetailRow({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-stone-100 last:border-0">
      <span className="text-[11px] font-semibold text-stone-500 shrink-0">{label}</span>
      <span className={`text-sm text-stone-900 text-right break-words ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function PaymentDetailModal({ payment, onClose }) {
  if (!payment) return null;

  const isVoided = Boolean(payment.voided_at);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/55 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50/80">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gold uppercase">Detalle de pago</p>
            <p className="font-serif text-lg text-stone-900">#{payment.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <PaymentTypeBadge payment={payment} />
            <span
              className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                isVoided
                  ? 'border-stone-200 bg-stone-100 text-stone-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {isVoided ? 'Anulado' : 'Vigente'}
            </span>
            <span className="ml-auto font-serif text-xl font-medium text-gold tabular-nums">
              {formatPaymentAmount(payment.amount)}
            </span>
          </div>

          <DetailRow label="Fecha" value={formatPaymentDateTime(payment.created_at, payment.start_time)} />
          <DetailRow label="Referencia" value={payment.reference} mono />
          <DetailRow label="Método" value={formatPaymentMethodName(payment.payment_method_name)} />
          <DetailRow label="Cliente" value={getPaymentClientName(payment)} />
          <DetailRow label="Concepto" value={getPaymentConcept(payment)} />
          <DetailRow label="Notas" value={payment.notes} />
          {isVoided ? (
            <>
              <DetailRow
                label="Anulado el"
                value={payment.voided_at ? formatPaymentDateTime(payment.voided_at) : '—'}
              />
              <DetailRow label="Motivo anulación" value={payment.void_reason} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
