import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

export default function VoidMovementModal({ movement, onClose, onConfirm, isSubmitting }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [movement?.id]);

  if (!movement) return null;

  const qty = movement.quantityChange ?? movement.quantity_change ?? 0;

  return (
    <AdminModalShell
      open
      onClose={() => !isSubmitting && onClose()}
      title="¿Anular este ajuste?"
      size="md"
      zIndexClass="z-[60]"
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
        Movimiento <strong className="text-stone-800">#{movement.id}</strong> ·{' '}
        <strong className={qty >= 0 ? 'text-emerald-700' : 'text-red-700'}>
          {qty >= 0 ? '+' : ''}
          {qty}
        </strong>{' '}
        unidades. Se revertirá el stock automáticamente.
      </p>
      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Motivo *</label>
      <textarea
        value={reason}
        data-autofocus
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Ej. error de digitación, conteo incorrecto…"
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-gold focus:ring-2 focus:ring-gold/30 outline-none resize-none"
      />
    </AdminModalShell>
  );
}
