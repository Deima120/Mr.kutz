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

      {showForm && (
        <div className="relative rounded-[1.35rem] p-[1.5px] bg-gradient-to-br from-gold/55 via-stone-100/60 to-gold/30 shadow-[0_16px_44px_rgba(0,0,0,0.1)] mb-6">
          <div className="rounded-[1.28rem] bg-white/90 backdrop-blur-md border border-white/90 p-4 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold mb-4">Registrar compra</p>
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
              <TableHeader>Fecha</TableHeader>
            </TableHead>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.supplier_name || '-'}</TableCell>
                  <TableCell>{p.invoice_number || '-'}</TableCell>
                  <TableCell>${Math.round(Number(p.total_amount || 0)).toLocaleString('es-CO')}</TableCell>
                  <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString('es-ES') : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
