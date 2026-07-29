import { useEffect, useState } from 'react';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { VOID_REASON_FIELD_CLASS, VOID_REASON_MAX } from '@/shared/feedback/voidReasonField';

export default function VoidMovementModal({ movement, onClose, onConfirm, isSubmitting }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [movement?.id]);

  if (!movement) return null;

  const qty = movement.quantityChange ?? movement.quantity_change ?? 0;

  return (
    <AdminConfirmModal
      open
      variant="warning"
      size="md"
      zIndexClass="z-[210]"
      title="¿Anular este ajuste?"
      description={
        <>
          Movimiento <strong className="text-stone-800">#{movement.id}</strong> ·{' '}
          <strong className={qty >= 0 ? 'text-emerald-700' : 'text-red-700'}>
            {qty >= 0 ? '+' : ''}
            {qty}
          </strong>{' '}
          unidades. Se revertirá el stock automáticamente.
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
        placeholder="Ej. error de digitación, conteo incorrecto…"
        className={VOID_REASON_FIELD_CLASS}
      />
    </AdminConfirmModal>
  );
}
