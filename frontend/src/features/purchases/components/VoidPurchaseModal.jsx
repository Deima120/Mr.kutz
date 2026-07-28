import { useEffect, useState } from 'react';
import { formatPurchaseAmount } from '@/features/purchases/utils/purchaseFormatters';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { VOID_REASON_FIELD_CLASS, VOID_REASON_MAX } from '@/shared/feedback/voidReasonField';

export default function VoidPurchaseModal({ purchase, onClose, onConfirm, isSubmitting }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [purchase?.id]);

  if (!purchase) return null;

  return (
    <AdminConfirmModal
      open
      variant="warning"
      size="md"
      title={`¿Cancelar orden #${purchase.id}?`}
      description={
        <>
          Total{' '}
          <strong className="text-stone-800">
            {formatPurchaseAmount(purchase.totalAmount ?? purchase.total_amount)}
          </strong>
          {purchase.supplier?.name || purchase.supplier_name ? (
            <>
              {' '}
              · <strong className="text-stone-800">{purchase.supplier?.name ?? purchase.supplier_name}</strong>
            </>
          ) : null}
          . Solo puede cancelarse antes de recibir mercancía.
        </>
      }
      confirmLabel="Sí, cancelar"
      submittingLabel="Cancelando…"
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
        placeholder="Ej. factura duplicada, error de digitación…"
        className={VOID_REASON_FIELD_CLASS}
      />
    </AdminConfirmModal>
  );
}
