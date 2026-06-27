/**
 * Modal de confirmación para eliminar registros — overlay a pantalla completa.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

export default function AdminDeleteModal({
  open,
  title,
  itemName,
  description,
  isDeleting = false,
  onCancel,
  onConfirm,
  confirmLabel = 'Sí, eliminar',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const titleId = 'admin-delete-modal-title';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-6 max-w-sm w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" aria-hidden />

        <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5" aria-hidden />
        </div>

        <h3 id={titleId} className="font-serif text-lg font-bold text-stone-900 text-center mb-2">
          {title}
        </h3>

        <p className="text-stone-500 text-xs sm:text-sm text-center leading-relaxed mb-6">
          {description ?? (
            <>
              ¿Estás seguro de que deseas eliminar permanentemente{' '}
              <strong className="text-stone-850 font-bold">{itemName}</strong>? Esta acción no se puede deshacer.
            </>
          )}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-bold rounded-xl text-sm transition-all border border-stone-200/50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Eliminando…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
