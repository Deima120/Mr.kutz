/**
 * Lista de productos del lote recién recibido (siempre lista, 1 o N).
 */

import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

/**
 * @param {{ productId: number, name: string, quantity: number, unitCost?: number }[]} products
 */
export default function ReceivedProductsModal({ open, products = [], onClose }) {
  if (!open) return null;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title="Productos recibidos"
      subtitle="Confirma el impacto en inventario de este lote"
      size="md"
      labelledBy="received-products-title"
    >
      {(products?.length ?? 0) === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">No hay productos en este lote.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {products.map((p) => (
            <li key={p.productId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex items-start gap-2">
                <Package className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-stone-500">
                    +{p.quantity} u
                    {p.unitCost != null ? ` · $${Number(p.unitCost).toFixed(2)}` : ''}
                  </p>
                </div>
              </div>
              <Link
                to={`/inventory/${p.productId}`}
                className="btn-admin-outline text-xs py-1.5 px-2.5 shrink-0"
                onClick={onClose}
              >
                Ver ficha
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end pt-3 border-t border-stone-100 mt-2">
        <button type="button" onClick={onClose} className="btn-admin text-sm">
          Seguir en compras
        </button>
      </div>
    </AdminModalShell>
  );
}
