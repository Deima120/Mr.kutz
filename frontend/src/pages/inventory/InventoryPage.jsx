/**
 * Inventario: listado, edición (sin eliminar), venta → pagos con descuento de stock
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as productService from '../../services/productService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';
import StatsCard from '../../components/admin/StatsCard';
import { downloadCSV, printAsPDF } from '../../utils/export';

const MOVEMENT_LABELS = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  damage: 'Daño o pérdida',
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [historyModal, setHistoryModal] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [quickUpdating, setQuickUpdating] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const params = { active: showInactive ? 'false' : undefined };
      if (showLowStockOnly) params.lowStock = 'true';
      if (searchDebounced.trim()) params.search = searchDebounced.trim();
      const [data, lowData] = await Promise.all([
        productService.getProducts(params),
        productService.getLowStock(),
      ]);
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setProducts(list);
      setLowStock(Array.isArray(lowData) ? lowData : (lowData?.data ?? []));
    } catch (err) {
      setError(err?.message || 'Error al cargar inventario');
      if (!silent) {
        setProducts([]);
        setLowStock([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [showInactive, showLowStockOnly, searchDebounced]);

  /** Entrada rápida (+1): movimiento tipo compra */
  const handleQuickStock = async (product, delta) => {
    if (delta <= 0) return;
    setQuickUpdating(product.id);
    setError('');
    try {
      await productService.updateStock(product.id, {
        quantityChange: delta,
        movementType: 'purchase',
        notes: 'Entrada rápida desde inventario',
      });
      await fetchProducts(true);
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
      fetchProducts();
    } finally {
      setQuickUpdating(null);
    }
  };

  const handleOpenAdjust = (product) => {
    setAdjustModal(product);
    setAdjustQty(1);
  };

  const handleSaveAdjust = async (isEntrada) => {
    if (!adjustModal) return;
    const qty = isEntrada ? Math.abs(adjustQty) : -Math.abs(adjustQty);
    setAdjustSaving(true);
    setError('');
    try {
      await productService.updateStock(adjustModal.id, {
        quantityChange: qty,
        movementType: qty > 0 ? 'purchase' : 'adjustment',
        notes: qty > 0 ? 'Ajuste de entrada' : 'Ajuste de salida',
      });
      setAdjustModal(null);
      fetchProducts();
    } catch (err) {
      setError(err?.message || 'Error al actualizar stock');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleOpenHistory = async (product) => {
    setHistoryModal(product);
    setMovements([]);
    setMovementsLoading(true);
    try {
      const data = await productService.getProductMovements(product.id);
      setMovements(Array.isArray(data) ? data : (data?.data ?? []));
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  const goToSell = (product) => {
    navigate(`/payments/new?productId=${product.id}`);
  };

  const isLowStock = (p) => (p.quantity ?? 0) <= (p.min_stock ?? p.minStock ?? 0);
  /** API Prisma usa `isActive`; toleramos `is_active` por compatibilidad */
  const isProductActive = (p) => {
    const v = p.isActive ?? p.is_active;
    return v !== false;
  };
  const totalUnits = products.reduce((sum, p) => sum + (p.quantity ?? 0), 0);

  return (
    <div className="page-shell">
      <PageHeader
        title="Inventario"
        label="Stock"
        subtitle="Productos, alertas, movimientos y venta en caja (pagos)"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  'inventario.csv',
                  products.map((p) => ({
                    id: p.id,
                    nombre: p.name,
                    categoria: p.category_name || '',
                    sku: p.sku || '',
                    stock: p.quantity ?? 0,
                    min_stock: p.min_stock ?? p.minStock ?? 0,
                    precio_venta: p.retail_price ?? '',
                    activo: isProductActive(p) ? 'Sí' : 'No',
                  }))
                )
              }
              className="btn-admin-outline w-full sm:w-auto"
            >
              Exportar CSV
            </button>
            <button type="button" onClick={printAsPDF} className="btn-admin-outline w-full sm:w-auto">
              Exportar PDF
            </button>
            <Link to="/purchases" className="btn-admin-outline w-full sm:w-auto">
              Compras (abastecimiento)
            </Link>
            <Link to="/inventory/categories" className="btn-admin-outline w-full sm:w-auto">
              Categorías
            </Link>
            <Link to="/inventory/new" className="btn-admin w-full sm:w-auto">
              Nuevo producto
            </Link>
          </div>
        }
      />

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Total productos" value={products.length} />
        <StatsCard
          label="Stock bajo"
          value={lowStock.length}
          sublabel={lowStock.length > 0 ? 'Revisar alertas' : undefined}
        />
        <StatsCard label="Unidades en stock" value={totalUnits} />
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 mb-2">
            {lowStock.length} producto(s) con stock bajo o agotado
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            {lowStock.map((p) => (
              <li key={p.id}>
                <Link to={`/inventory/${p.id}/edit`} className="hover:underline font-medium">
                  {p.name}
                </Link>
                : <strong>{p.quantity ?? 0}</strong> {p.unit || 'u'} (mínimo {p.min_stock ?? p.minStock ?? 0})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-3 md:gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className="input-premium py-2.5 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-premium py-2.5 text-sm min-w-[180px]"
        >
          <option value="">Todas las categorías</option>
          {[...new Set(products.map((p) => p.category_name).filter(Boolean))].map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer bg-white border border-stone-200 rounded-xl px-3 py-2.5">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-stone-300 text-gold focus:ring-gold/40"
          />
          Mostrar inactivos
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer bg-white border border-stone-200 rounded-xl px-3 py-2.5">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded border-stone-300 text-gold focus:ring-gold/40"
          />
          Solo stock bajo
        </label>
      </div>

      {error && (
        <div className="alert-error" role="alert">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">Cargando inventario...</div>
        </DataCard>
      ) : products.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">
            {searchDebounced || showLowStockOnly
              ? 'No hay productos que coincidan con los filtros.'
              : 'No hay productos registrados.'}
          </div>
        </DataCard>
      ) : (
        <DataCard>
          <Table>
            <TableHead>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Categoría</TableHeader>
              <TableHeader>SKU</TableHeader>
              <TableHeader>P. venta</TableHeader>
              <TableHeader>Stock</TableHeader>
              <TableHeader>Mínimo</TableHeader>
              <TableHeader>Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                (categoryFilter && p.category_name !== categoryFilter) ? null : (
                <TableRow key={p.id}>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    <Link
                      to={`/inventory/${p.id}/edit`}
                      className="font-medium text-barber-dark hover:text-gold transition-colors"
                    >
                      {p.name}
                    </Link>
                    {!isProductActive(p) && (
                      <span className="ml-2 text-xs text-stone-500">(inactivo)</span>
                    )}
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    {p.category_name || '-'}
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    {p.sku || '-'}
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    {p.retail_price != null && Number(p.retail_price) > 0
                      ? `$${Number(p.retail_price).toFixed(2)}`
                      : '—'}
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold min-w-[2rem] ${isLowStock(p) ? 'text-amber-600' : ''}`}>
                        {p.quantity ?? 0} {p.unit || 'u'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickStock(p, 1)}
                          disabled={quickUpdating === p.id}
                          className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm disabled:opacity-50"
                          title="+1 entrada"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(p)}
                        className="text-xs text-stone-500 hover:text-stone-700"
                        title="Ajustar cantidad"
                      >
                        ±
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    {p.min_stock ?? p.minStock ?? 0}
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => goToSell(p)}
                        disabled={(p.quantity ?? 0) <= 0}
                        className="text-sm font-medium text-gold hover:text-gold-dark transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Vender
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(p)}
                        className="text-sm font-medium text-barber-dark hover:text-gold transition-colors"
                      >
                        Historial
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}

      {/* Modal ajuste rápido — cantidad + Sumar/Restar */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !adjustSaving && setAdjustModal(null)}>
          <div
            className="landing-card max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-medium text-stone-900">{adjustModal.name}</h3>
            <p className="text-sm text-stone-500">
              Stock actual: <strong className="text-gold">{adjustModal.quantity ?? 0}</strong> {adjustModal.unit || 'u'}
            </p>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAdjust(true);
                }}
                className="input-premium text-center text-lg"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={adjustSaving}
                onClick={() => handleSaveAdjust(true)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors"
              >
                Sumar
              </button>
              <button
                type="button"
                disabled={adjustSaving}
                onClick={() => handleSaveAdjust(false)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors"
              >
                Restar
              </button>
            </div>
            <button
              type="button"
              disabled={adjustSaving}
              onClick={() => setAdjustModal(null)}
              className="w-full py-2 text-stone-500 hover:text-stone-700 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal historial de movimientos */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setHistoryModal(null)}>
          <div
            className="landing-card max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-stone-200/80">
              <h3 className="font-serif text-lg font-medium text-stone-900">Historial — {historyModal.name}</h3>
              <p className="text-sm text-stone-500">Últimos movimientos de stock</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {movementsLoading ? (
                <div className="py-8 text-center text-stone-500">Cargando...</div>
              ) : movements.length === 0 ? (
                <p className="text-stone-500 text-sm">Sin movimientos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {movements.map((m) => (
                    <li key={m.id} className="flex justify-between items-start text-sm border-b border-stone-100 pb-2">
                      <div>
                        <span className={`font-semibold ${m.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}
                        </span>
                        <span className="text-stone-500 ml-2">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
                        {m.notes && <p className="text-stone-500 text-xs mt-0.5">{m.notes}</p>}
                      </div>
                      <span className="text-stone-400 text-xs">
                        {m.created_at ? new Date(m.created_at).toLocaleString('es-ES') : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-stone-200/80">
              <button
                type="button"
                onClick={() => setHistoryModal(null)}
                className="w-full px-4 py-2.5 btn-admin-outline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
