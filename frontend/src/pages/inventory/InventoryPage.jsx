/**
 * Inventario mejorado: resumen, búsqueda, ajuste con modal, historial de movimientos
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as productService from '../../services/productService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';
import StatsCard from '../../components/admin/StatsCard';

const MOVEMENT_LABELS = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  damage: 'Daño/Pérdida',
};

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
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

  const handleQuickStock = async (product, delta) => {
    setQuickUpdating(product.id);
    setError('');
    try {
      await productService.updateStock(product.id, {
        quantityChange: delta,
        movementType: delta > 0 ? 'purchase' : 'sale',
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
        movementType: qty > 0 ? 'purchase' : 'sale',
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar producto "${name}"?`)) return;
    try {
      await productService.deleteProduct(id);
      fetchProducts();
      if (adjustModal?.id === id) setAdjustModal(null);
      if (historyModal?.id === id) setHistoryModal(null);
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  const isLowStock = (p) => (p.quantity ?? 0) <= (p.min_stock ?? 0);
  const totalUnits = products.reduce((sum, p) => sum + (p.quantity ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        subtitle="Productos y control de stock"
        actions={
          <Link
            to="/inventory/new"
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm"
          >
            + Nuevo producto
          </Link>
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
            ⚠️ {lowStock.length} producto(s) con stock bajo o agotado
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            {lowStock.map((p) => (
              <li key={p.id}>
                <Link to={`/inventory/${p.id}/edit`} className="hover:underline">
                  {p.name}
                </Link>
                : <strong>{p.quantity ?? 0}</strong> {p.unit || 'u'} (mínimo {p.min_stock})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Mostrar inactivos
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Solo stock bajo
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">Cargando inventario...</div>
        </DataCard>
      ) : products.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">
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
              <TableHeader>SKU</TableHeader>
              <TableHeader>Stock</TableHeader>
              <TableHeader>Mínimo</TableHeader>
              <TableHeader>Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    <Link
                      to={`/inventory/${p.id}/edit`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {p.name}
                    </Link>
                    {!p.is_active && (
                      <span className="ml-2 text-xs text-gray-500">(inactivo)</span>
                    )}
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    {p.sku || '-'}
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
                        <button
                          type="button"
                          onClick={() => handleQuickStock(p, -1)}
                          disabled={quickUpdating === p.id || (p.quantity ?? 0) <= 0}
                          className="w-8 h-8 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-bold text-sm disabled:opacity-50"
                          title="-1 salida"
                        >
                          −
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(p)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                        title="Ajustar cantidad"
                      >
                        ±
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>{p.min_stock ?? 0}</TableCell>
                  <TableCell className={isLowStock(p) ? 'bg-amber-50/50' : ''}>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(p)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Historial
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-sm text-gray-500 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}

      {/* Modal ajuste rápido — cantidad + Sumar/Restar */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !adjustSaving && setAdjustModal(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">{adjustModal.name}</h3>
            <p className="text-sm text-gray-500">
              Stock actual: <strong>{adjustModal.quantity ?? 0}</strong> {adjustModal.unit || 'u'}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAdjust(true);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-center text-lg"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={adjustSaving}
                onClick={() => handleSaveAdjust(true)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Sumar
              </button>
              <button
                type="button"
                disabled={adjustSaving}
                onClick={() => handleSaveAdjust(false)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Restar
              </button>
            </div>
            <button
              type="button"
              disabled={adjustSaving}
              onClick={() => setAdjustModal(null)}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
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
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Historial — {historyModal.name}</h3>
              <p className="text-sm text-gray-500">Últimos movimientos de stock</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {movementsLoading ? (
                <div className="py-8 text-center text-gray-500">Cargando...</div>
              ) : movements.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin movimientos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {movements.map((m) => (
                    <li key={m.id} className="flex justify-between items-start text-sm border-b border-gray-100 pb-2">
                      <div>
                        <span className={`font-medium ${m.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}
                        </span>
                        <span className="text-gray-500 ml-2">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
                        {m.notes && <p className="text-gray-500 text-xs mt-0.5">{m.notes}</p>}
                      </div>
                      <span className="text-gray-400 text-xs">
                        {m.created_at ? new Date(m.created_at).toLocaleString('es-ES') : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setHistoryModal(null)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
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
