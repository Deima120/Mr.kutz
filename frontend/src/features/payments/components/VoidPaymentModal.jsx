import { useEffect, useState } from 'react';
import { formatPaymentAmount } from '@/features/payments/utils/paymentFormatters';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { VOID_REASON_FIELD_CLASS, VOID_REASON_MAX } from '@/shared/feedback/voidReasonField';

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
    : `¿Anular venta #${payment.id}?`;
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
    <AdminConfirmModal
      open
      variant="warning"
      size="md"
      title={title}
      description={
        <>
          Monto <strong className="text-stone-800">{formatPaymentAmount(amount)}</strong>
          {!isLine && payment.reference ? (
            <>
              {' '}
              · Ref. <strong className="text-stone-800">{payment.reference}</strong>
            </>
          ) : null}
          . El registro se conserva y deja de sumar en totales.
          {hasProductStock ? ' El stock del producto volverá al inventario.' : ''}
        </>
      }
      confirmLabel="Sí, anular"
      submittingLabel="Anulando…"
      isSubmitting={isSubmitting}
      confirmDisabled={!reason.trim()}
      autoFocusConfirm={false}
      onCancel={onClose}
      onConfirm={() => onConfirm(reason.trim())}
    >
      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Motivo *</label>
      <textarea
        value={reason}
        data-autofocus
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={VOID_REASON_MAX}
        placeholder="Ej. error de registro, devolución al cliente…"
        className={VOID_REASON_FIELD_CLASS}
      />
    </AdminConfirmModal>
  );
}
