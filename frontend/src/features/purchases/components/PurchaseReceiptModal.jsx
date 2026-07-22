import { useEffect, useMemo, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import * as purchaseService from '@/features/purchases/services/purchaseService';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

const itemValue = (item, camel, snake, fallback = 0) => item?.[camel] ?? item?.[snake] ?? fallback;

export default function PurchaseReceiptModal({ purchase, onClose, onSuccess }) {
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!purchase) return;
    setReference('');
    setNotes('');
    setError('');
    setItems(
      (purchase.items ?? []).map((item) => ({
        purchaseItemId: item.id,
        name:
          item.product?.name ??
          item.productName ??
          item.product_name ??
          `Producto #${item.productId ?? item.product_id}`,
        productId: item.productId ?? item.product_id ?? null,
        pending: Math.max(
          0,
          Number(
            itemValue(
              item,
              'pendingQuantity',
              'pending_quantity',
              Number(itemValue(item, 'quantity', 'quantity')) -
                Number(itemValue(item, 'receivedQuantity', 'received_quantity'))
            )
          )
        ),
        quantity: '',
        unitCost: String(itemValue(item, 'unitCost', 'unit_cost', '')),
      }))
    );
  }, [purchase]);

  const receivable = useMemo(() => items.filter((item) => item.pending > 0), [items]);
  if (!purchase) return null;

  const update = (id, field, value) => {
    setItems((current) =>
      current.map((item) => (item.purchaseItemId === id ? { ...item, [field]: value } : item))
    );
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const selected = receivable.filter((item) => Number(item.quantity) > 0);
    if (!reference.trim()) return setError('La referencia de recepción es obligatoria.');
    if (selected.length === 0) return setError('Indica al menos una cantidad recibida.');
    const invalid = selected.find((item) => {
      const unitCostText = String(item.unitCost ?? '').trim();
      const unitCost = Number(unitCostText);
      return (
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) > item.pending ||
        !unitCostText ||
        !Number.isFinite(unitCost) ||
        unitCost <= 0
      );
    });
    if (invalid) return setError(`Revisa cantidad y costo de ${invalid.name}.`);

    setLoading(true);
    setError('');
    try {
      await purchaseService.receivePurchase(purchase.id, {
        reference: reference.trim(),
        receiptNumber: reference.trim(),
        notes: notes.trim() || undefined,
        items: selected.map((item) => ({
          purchaseItemId: item.purchaseItemId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      });
      onSuccess?.({
        products: selected
          .filter((item) => item.productId)
          .map((item) => ({
            productId: Number(item.productId),
            name: item.name,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
          })),
      });
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la recepción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModalShell
      open
      onClose={() => !loading && onClose()}
      title={`Recibir orden #${purchase.id}`}
      subtitle="Entrada de inventario"
      size="xl"
      preventClose={loading}
      closeOnBackdrop={!loading}
      labelledBy="receipt-title"
    >
      <form id="receipt-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="alert-error text-sm" role="alert">
            {error}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-stone-600">
            Referencia *
            <input
              value={reference}
              data-autofocus
              onChange={(event) => setReference(event.target.value)}
              maxLength={80}
              className="input-premium mt-1 py-2 text-sm"
              placeholder="Remisión, factura o lote"
            />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            Notas
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              className="input-premium mt-1 py-2 text-sm"
              placeholder="Observaciones opcionales"
            />
          </label>
        </div>
        <div className="space-y-2">
          {receivable.map((item) => (
            <div
              key={item.purchaseItemId}
              className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_8rem_9rem] sm:items-end"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                <p className="text-xs text-stone-500">Pendiente: {item.pending} unidades</p>
              </div>
              <label className="text-[11px] font-semibold text-stone-600">
                Recibir
                <input
                  type="number"
                  min="0"
                  max={item.pending}
                  step="1"
                  value={item.quantity}
                  onChange={(event) => update(item.purchaseItemId, 'quantity', event.target.value)}
                  className="input-premium mt-1 py-2 text-sm"
                />
              </label>
              <label className="text-[11px] font-semibold text-stone-600">
                Costo unitario
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(event) => update(item.purchaseItemId, 'unitCost', event.target.value)}
                  className="input-premium mt-1 py-2 text-sm"
                />
              </label>
            </div>
          ))}
          {receivable.length === 0 && (
            <p className="py-5 text-center text-sm text-stone-500">Esta orden no tiene unidades pendientes.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button type="button" onClick={onClose} disabled={loading} className="btn-admin-outline text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || receivable.length === 0}
            className="btn-admin inline-flex items-center gap-2 text-sm"
          >
            <PackageCheck className="h-4 w-4" /> {loading ? 'Registrando…' : 'Registrar recepción'}
          </button>
        </div>
      </form>
    </AdminModalShell>
  );
}
