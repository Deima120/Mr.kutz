import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
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
    <AdminModalShell
      open
      onClose={onClose}
      title={`Historial — ${product.name}`}
      subtitle="Últimos movimientos de stock"
      size="lg"
      footer={
        <button type="button" onClick={onClose} className="w-full px-4 py-2.5 btn-admin-outline text-sm">
          Cerrar
        </button>
      }
    >
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
            const qty = m.quantityChange ?? m.quantity_change ?? 0;
            const movementType = m.movementType ?? m.movement_type;
            const voided = isMovementVoided(m);
            const voidReason = m.voidReason ?? m.void_reason;
            const createdByEmail = m.createdByEmail ?? m.created_by_email;
            const createdAt = m.createdAt ?? m.created_at;
            const canVoid = m.canVoid ?? m.can_void;
            return (
              <li
                key={m.id}
                className={`flex justify-between items-start gap-3 text-sm border-b border-stone-100 pb-3 last:border-0 ${voided ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-semibold ${qty >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {qty >= 0 ? '+' : ''}
                      {qty}
                    </span>
                    <span className="text-stone-500">{MOVEMENT_LABELS[movementType] || movementType}</span>
                    {voided && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                        Anulado
                      </span>
                    )}
                  </div>
                  {m.notes && <p className="text-stone-500 text-xs mt-1">{m.notes}</p>}
                  {voidReason && (
                    <p className="text-amber-700 text-xs mt-1">Motivo: {voidReason}</p>
                  )}
                  {ref && (
                    <div className="text-xs mt-1 text-stone-500">
                      {ref.type === 'payment' ? (
                        <Link to="/payments" className="text-gold hover:text-gold/80 font-medium" onClick={onClose}>
                          {ref.label}
                        </Link>
                      ) : (
                        <Link to="/purchases" className="text-gold hover:text-gold/80 font-medium" onClick={onClose}>
                          {ref.label}
                        </Link>
                      )}
                      {ref.reference && <span> · Recepción {ref.reference}</span>}
                      {!ref.reference && ref.receiptId && <span> · Recepción #{ref.receiptId}</span>}
                      {ref.supplierName && <span> · {ref.supplierName}</span>}
                    </div>
                  )}
                  {createdByEmail && (
                    <p className="text-stone-400 text-xs mt-1">Por {createdByEmail}</p>
                  )}
                  {canVoid && onVoidClick && (
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
                  {formatMovementDate(createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AdminModalShell>
  );
}
