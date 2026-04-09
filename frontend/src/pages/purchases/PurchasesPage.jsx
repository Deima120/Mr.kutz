import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';
import * as purchaseService from '../../services/purchaseService';
import * as productService from '../../services/productService';
import { downloadCSV, printAsPDF } from '../../utils/export';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierName: '',
    invoiceNumber: '',
    notes: '',
    items: [{ productId: '', quantity: 1, unitCost: 0 }],
  });
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, prod] = await Promise.all([
        purchaseService.getPurchases(),
        productService.getProducts(),
      ]);
      setPurchases(Array.isArray(p) ? p : (p?.data ?? []));
      setProducts(Array.isArray(prod) ? prod : (prod?.data ?? []));
    } catch (err) {
      setError(err?.message || 'Error al cargar compras');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPreview = useMemo(
    () => form.items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0),
    [form.items]
  );

  const updateItem = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { productId: '', quantity: 1, unitCost: 0 }] }));
  const removeItem = (idx) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await purchaseService.createPurchase({
        supplierName: form.supplierName || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        notes: form.notes || undefined,
        items: form.items
          .filter((i) => i.productId)
          .map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity), unitCost: Number(i.unitCost) })),
      });
      setShowForm(false);
      setForm({ supplierName: '', invoiceNumber: '', notes: '', items: [{ productId: '', quantity: 1, unitCost: 0 }] });
      fetchData();
    } catch (err) {
      setError(err?.message || 'Error al registrar compra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Compras"
        label="Abastecimiento"
        subtitle="Órdenes de compra y entrada de inventario"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  'compras.csv',
                  purchases.map((p) => ({
                    id: p.id,
                    proveedor: p.supplier_name || '',
                    factura: p.invoice_number || '',
                    total: p.total_amount,
                    estado: p.voided_at ? 'Anulada' : 'Activa',
                    fecha: p.created_at,
                  }))
                )
              }
              className="btn-admin-outline"
            >
              Exportar CSV
            </button>
            <button type="button" onClick={printAsPDF} className="btn-admin-outline">
              Exportar PDF
            </button>
            <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-admin">
              {showForm ? 'Cerrar' : '+ Nueva compra'}
            </button>
          </div>
        }
      />

      {error && <div className="alert-error">{error}</div>}

      {voidTarget != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-purchase-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-stone-200 shadow-xl p-5 sm:p-6">
            <h2 id="void-purchase-title" className="text-lg font-semibold text-stone-900 mb-1">
              Anular compra #{voidTarget}
            </h2>
            <p className="text-sm text-stone-600 mb-4">
              Se descontará del inventario la cantidad ingresada en cada ítem. Solo es posible si hay stock suficiente.
            </p>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Motivo (opcional)</label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="input-premium w-full min-h-[4.5rem] resize-y mb-4"
              maxLength={500}
              placeholder="Ej. factura duplicada, error de digitación…"
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className="btn-admin-outline"
                disabled={voiding}
                onClick={() => {
                  setVoidTarget(null);
                  setVoidReason('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-admin bg-red-700 hover:bg-red-800 border-red-800"
                disabled={voiding}
                onClick={async () => {
                  setVoiding(true);
                  setError('');
                  try {
                    await purchaseService.voidPurchase(voidTarget, {
                      voidReason: voidReason.trim() || undefined,
                    });
                    setVoidTarget(null);
                    setVoidReason('');
                    fetchData();
                  } catch (err) {
                    setError(err?.message || err?.errors?.[0]?.message || 'No se pudo anular la compra');
                  } finally {
                    setVoiding(false);
                  }
                }}
              >
                {voiding ? 'Anulando…' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="relative rounded-[1.35rem] p-[1.5px] bg-gradient-to-br from-gold/55 via-stone-100/60 to-gold/30 shadow-[0_16px_44px_rgba(0,0,0,0.1)] mb-6">
          <div className="rounded-[1.28rem] bg-white/90 backdrop-blur-md border border-white/90 p-4 sm:p-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-gold mb-4">Registrar compra</p>
            <form className="space-y-4" onSubmit={submit}>
            <div className="grid md:grid-cols-3 gap-3">
              <input
                value={form.supplierName}
                onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
                className="input-premium"
                placeholder="Proveedor"
              />
              <input
                value={form.invoiceNumber}
                onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                className="input-premium"
                placeholder="No. factura"
              />
              <input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="input-premium"
                placeholder="Notas"
              />
            </div>

            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid md:grid-cols-5 gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                    className="input-premium md:col-span-2"
                    required
                  >
                    <option value="">Producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    className="input-premium"
                    placeholder="Cantidad"
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitCost}
                    onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                    className="input-premium"
                    placeholder="Costo unitario"
                    required
                  />
                  <button type="button" onClick={() => removeItem(idx)} className="btn-outline" disabled={form.items.length === 1}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={addItem} className="btn-admin-outline">
                + Agregar item
              </button>
              <p className="text-stone-600 text-sm">Total estimado: <strong>${Math.round(totalPreview).toLocaleString('es-CO')}</strong></p>
            </div>

            <button type="submit" disabled={saving} className="btn-admin">
              {saving ? 'Guardando...' : 'Registrar compra'}
            </button>
            </form>
          </div>
        </div>
      )}

      <DataCard>
        {loading ? (
          <div className="py-12 text-center text-stone-500">Cargando compras...</div>
        ) : purchases.length === 0 ? (
          <div className="py-12 text-center text-stone-500">No hay compras registradas.</div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>ID</TableHeader>
              <TableHeader>Proveedor</TableHeader>
              <TableHeader>Factura</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Fecha</TableHeader>
              <TableHeader className="text-right">Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.supplier_name || '-'}</TableCell>
                  <TableCell>{p.invoice_number || '-'}</TableCell>
                  <TableCell>${Math.round(Number(p.total_amount || 0)).toLocaleString('es-CO')}</TableCell>
                  <TableCell>
                    {p.voided_at ? (
                      <span className="text-red-700 text-sm font-medium">Anulada</span>
                    ) : (
                      <span className="text-emerald-700 text-sm">Activa</span>
                    )}
                  </TableCell>
                  <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString('es-ES') : '-'}</TableCell>
                  <TableCell className="text-right">
                    {!p.voided_at ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-red-700 hover:text-red-900 underline-offset-2 hover:underline"
                        onClick={() => {
                          setVoidReason('');
                          setVoidTarget(p.id);
                        }}
                      >
                        Anular
                      </button>
                    ) : (
                      <span className="text-stone-400 text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
