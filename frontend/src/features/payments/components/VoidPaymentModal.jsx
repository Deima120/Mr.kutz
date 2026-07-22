import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { formatPaymentAmount } from '@/features/payments/utils/paymentFormatters';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

export default function VoidPaymentModal({
  payment,
  line = null,
  onClose,
  onConfirm,
  isSubmitting,
}) {
  const [reason, setReason] = useState('');
  const isLine = Boolean(line);

  useEffect(() => {
    setReason('');
  }, [payment?.id, line?.id]);

  if (!payment) return null;

  const title = isLine
    ? `¿Anular línea #${line.id}?`
    : `¿Anular cobro #${payment.id}?`;
  const amount = isLine
    ? line.lineAmount ?? line.line_amount
    : payment.amount;
  const hasProductStock =
    isLine
      ? line.lineType === 'product' || line.line_type === 'product'
      : (payment.lines || []).some(
          (l) => !l.voidedAt && !l.voided_at && (l.lineType === 'product' || l.line_type === 'product')
        );

  return (
    <AdminModalShell
      open
      onClose={() => !isSubmitting && onClose()}
      title={title}
      size="md"
      showClose={false}
      preventClose={isSubmitting}
      closeOnBackdrop={!isSubmitting}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-semibold rounded-xl text-sm border border-stone-200/80"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Anulando…
              </>
            ) : (
              'Sí, anular'
            )}
          </button>
        </div>
      }
    >
      <div className="w-11 h-11 bg-amber-50 border border-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
        <Ban className="w-5 h-5" aria-hidden />
      </div>
      <p className="text-stone-500 text-xs text-center mb-4">
        Monto <strong className="text-stone-800">{formatPaymentAmount(amount)}</strong>
        {!isLine && payment.reference ? (
          <> · Ref. <strong className="text-stone-800">{payment.reference}</strong></>
        ) : null}
        . El registro se conserva y deja de sumar en totales.
        {hasProductStock ? ' El stock del producto volverá al inventario.' : ''}
      </p>
      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Motivo *</label>
      <textarea
        value={reason}
        data-autofocus
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Ej. error de registro, devolución al cliente…"
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-gold focus:ring-2 focus:ring-gold/30 outline-none resize-none"
      />
    </AdminModalShell>
  );
}
