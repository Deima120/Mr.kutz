import { X } from 'lucide-react';
import { formatPurchaseAmount, formatPurchaseDate } from '@/features/purchases/utils/purchaseFormatters';

const STATUS_LABELS = {
  draft: 'Borrador',
  ordered: 'Ordenada',
  partially_received: 'Recepción parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

const getStatus = (purchase) =>
  purchase.status ?? (purchase.voided_at ? 'cancelled' : 'ordered');

const itemNumber = (item, camel, snake, fallback = 0) =>
  Number(item?.[camel] ?? item?.[snake] ?? fallback);

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

export default function PurchaseDetailModal({ purchase, onClose }) {
  if (!purchase) return null;

  const status = getStatus(purchase);
  const isCancelled = status === 'cancelled';
  const items = Array.isArray(purchase.items) ? purchase.items : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/55 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50/80">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gold uppercase">Detalle de compra</p>
            <p className="font-serif text-lg text-stone-900">#{purchase.id}</p>
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
            <span
              className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                isCancelled
                  ? 'border-stone-200 bg-stone-100 text-stone-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
            <span className="ml-auto font-serif text-xl font-medium text-gold tabular-nums">
              {formatPurchaseAmount(purchase.totalAmount ?? purchase.total_amount)}
            </span>
          </div>

          <DetailRow label="Fecha" value={formatPurchaseDate(purchase.createdAt ?? purchase.created_at)} />
          <DetailRow label="Proveedor" value={purchase.supplier?.name ?? purchase.supplier_name} />
          <DetailRow label="Factura" value={purchase.invoiceNumber ?? purchase.invoice_number} mono />
          <DetailRow label="Notas" value={purchase.notes} />
          <DetailRow label="Registrado por" value={purchase.created_by_email} />

          {items.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-stone-500 mb-2">Artículos ({items.length})</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2 text-xs text-stone-700"
                  >
                    <span className="font-semibold text-stone-900">{item.product?.name ?? item.product_name ?? `Producto #${item.productId ?? item.product_id}`}</span>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-stone-500">
                      <span>Pedido: <strong>{itemNumber(item, 'quantity', 'quantity')}</strong></span>
                      <span>Recibido: <strong>{itemNumber(item, 'receivedQuantity', 'received_quantity')}</strong></span>
                      <span>Pendiente: <strong>{Math.max(0, itemNumber(item, 'pendingQuantity', 'pending_quantity', itemNumber(item, 'quantity', 'quantity') - itemNumber(item, 'receivedQuantity', 'received_quantity')))}</strong></span>
                    </div>
                    <p className="mt-1 text-stone-500">
                      {formatPurchaseAmount(item.unitCost ?? item.unit_cost)} c/u · <strong className="text-stone-800">{formatPurchaseAmount(item.subtotal)}</strong>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isCancelled ? (
            <>
              <DetailRow label="Cancelada el" value={formatPurchaseDate(purchase.cancelledAt ?? purchase.cancelled_at ?? purchase.voided_at)} />
              <DetailRow label="Motivo" value={purchase.cancelReason ?? purchase.cancel_reason ?? purchase.void_reason} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
