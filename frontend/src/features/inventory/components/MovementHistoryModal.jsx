import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import {
  MOVEMENT_LABELS,
  formatMovementDate,
  getMovementReference,
  isMovementVoided,
} from '@/features/inventory/utils/productFormatters';

export default function MovementHistoryModal({
  product,
  movements,
  loading,
  error,
  onClose,
  onVoidClick,
}) {
  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-stone-200/80">
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            Historial — {product.name}
          </h3>
          <p className="text-sm text-stone-500">Últimos movimientos de stock</p>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="alert-error text-sm py-2 mb-3" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <div className="py-8 text-center text-stone-500 text-sm">Cargando…</div>
          ) : movements.length === 0 ? (
            <p className="text-stone-500 text-sm">Sin movimientos registrados.</p>
          ) : (
            <ul className="space-y-3">
              {movements.map((m) => {
                const ref = getMovementReference(m);
                const qty = m.quantity_change ?? 0;
                const voided = isMovementVoided(m);
                return (
                  <li
                    key={m.id}
                    className={`flex justify-between items-start gap-3 text-sm border-b border-stone-100 pb-3 last:border-0 ${voided ? 'opacity-60' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-semibold ${qty >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {qty >= 0 ? '+' : ''}
                          {qty}
                        </span>
                        <span className="text-stone-500">
                          {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                        </span>
                        {voided && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                            Anulado
                          </span>
                        )}
                      </div>
                      {m.notes && <p className="text-stone-500 text-xs mt-1">{m.notes}</p>}
                      {m.void_reason && (
                        <p className="text-amber-700 text-xs mt-1">Motivo: {m.void_reason}</p>
                      )}
                      {ref && (
                        <p className="text-xs mt-1">
                          {ref.type === 'payment' ? (
                            <Link
                              to="/payments"
                              className="text-gold hover:text-gold/80 font-medium"
                              onClick={onClose}
                            >
                              {ref.label}
                            </Link>
                          ) : (
                            <Link
                              to="/purchases"
                              className="text-gold hover:text-gold/80 font-medium"
                              onClick={onClose}
                            >
                              {ref.label}
                            </Link>
                          )}
                        </p>
                      )}
                      {m.created_by_email && (
                        <p className="text-stone-400 text-xs mt-1">Por {m.created_by_email}</p>
                      )}
                      {m.can_void && onVoidClick && (
                        <button
                          type="button"
                          onClick={() => onVoidClick(m)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800"
                        >
                          <Ban className="w-3 h-3" aria-hidden />
                          Anular ajuste
                        </button>
                      )}
                    </div>
                    <span className="text-stone-400 text-xs whitespace-nowrap shrink-0">
                      {formatMovementDate(m.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-stone-200/80">
          <button type="button" onClick={onClose} className="w-full px-4 py-2.5 btn-admin-outline text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
