/**
 * Inventario: listado paginado, edición inline, ajustes y venta vía pagos.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, ShoppingCart, History, SlidersHorizontal, Upload } from 'lucide-react';
import * as productService from '@/features/inventory/services/productService';
import * as productCategoryService from '@/features/inventory/services/productCategoryService';
import { ProductForm } from '@/features/inventory/pages/ProductFormPage';
import AdjustStockModal from '@/features/inventory/components/AdjustStockModal';
import MovementHistoryModal from '@/features/inventory/components/MovementHistoryModal';
import VoidMovementModal from '@/features/inventory/components/VoidMovementModal';
import ImportProductsModal from '@/features/inventory/components/ImportProductsModal';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import StatsCard from '@/shared/components/admin/StatsCard';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import {
  AdminPagination,
  AdminFilterRow,
  FilterSelect,
} from '@/shared/components/admin/AdminListControls';
import SuccessToast from '@/shared/components/SuccessToast';
import {
  formatProductRetailPrice,
  formatProductCostPrice,
  formatProductMargin,
  formatProductUnit,
  formatInventoryValue,
  getProductMinStock,
  getProductRetailPrice,
  getProductCostPrice,
  isLowStock,
  isProductActive,
} from '@/features/inventory/utils/productFormatters';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function InventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [summary, setSummary] = useState({ totalUnits: 0, lowStockCount: 0, inventoryValue: 0 });
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formView, setFormView] = useState(null);

  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [historyModal, setHistoryModal] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState('');

  const [quickUpdating, setQuickUpdating] = useState(null);
  const [voidMovement, setVoidMovement] = useState(null);
  const [isVoiding, setIsVoiding] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isCreating = formView === 'create';
  const editingId = typeof formView === 'number' ? formView : null;
  const isFormOpen = isCreating || editingId != null;
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    const editMatch = location.pathname.match(/^\/inventory\/(\d+)\/edit$/);
    if (editMatch) {
      setFormView(parseInt(editMatch[1], 10));
      navigate('/inventory', { replace: true });
      return;
    }
    if (location.pathname === '/inventory/new') {
      setFormView('create');
      navigate('/inventory', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (searchParams.get('lowStock') === 'true') {
      setShowLowStockOnly(true);
      const next = new URLSearchParams(searchParams);
      next.delete('lowStock');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    productCategoryService
      .getCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : (rows?.data ?? [])))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [showInactive, showLowStockOnly, searchDebounced, categoryFilter, pageSize]);

  const fetchProducts = useCallback(
    async (targetPage = page, silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const params = {
          limit: pageSize,
          offset: (targetPage - 1) * pageSize,
          active: showInactive ? 'false' : undefined,
        };
        if (showLowStockOnly) params.lowStock = 'true';
        if (searchDebounced.trim()) params.search = searchDebounced.trim();
        if (categoryFilter) params.categoryId = categoryFilter;

        const listResult = await productService.getProducts(params);

        setProducts(listResult.data ?? []);
        setListTotal(listResult.total ?? 0);
        setSummary(listResult.summary ?? { totalUnits: 0, lowStockCount: 0 });
      } catch (err) {
        setError(err?.message || 'Error al cargar inventario');
        if (!silent) {
          setProducts([]);
          setListTotal(0);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize, showInactive, showLowStockOnly, searchDebounced, categoryFilter]
  );

  useEffect(() => {
    if (!isFormOpen) fetchProducts(page);
  }, [fetchProducts, isFormOpen, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFormSuccess = ({ created, updated } = {}) => {
    setFormView(null);
    if (created) setSuccessMessage('Producto creado correctamente.');
    if (updated) setSuccessMessage('Producto actualizado correctamente.');
    setPage(1);
    fetchProducts(1);
  };

  const handleQuickStock = async (product, delta) => {
    if (delta <= 0) return;
    setQuickUpdating(product.id);
    setError('');
    try {
      await productService.updateStock(product.id, {
        quantityChange: delta,
        movementType: 'adjustment',
        notes: 'Entrada rápida desde inventario',
      });
      await fetchProducts(page, true);
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
      fetchProducts(page, true);
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
    if (!isEntrada && Math.abs(qty) > (adjustModal.quantity ?? 0)) {
      setError('El stock no puede ser negativo.');
      return;
    }
    setAdjustSaving(true);
    setError('');
    try {
      await productService.updateStock(adjustModal.id, {
        quantityChange: qty,
        movementType: 'adjustment',
        notes: qty > 0 ? 'Ajuste de entrada' : 'Ajuste de salida',
      });
      setAdjustModal(null);
      fetchProducts(page);
    } catch (err) {
      setError(err?.message || 'Error al actualizar stock');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleOpenHistory = async (product) => {
    setHistoryModal(product);
    setMovements([]);
    setMovementsError('');
    setMovementsLoading(true);
    try {
      const data = await productService.getProductMovements(product.id);
      setMovements(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      setMovements([]);
      setMovementsError(err?.message || 'No se pudo cargar el historial.');
    } finally {
      setMovementsLoading(false);
    }
  };

  const reloadMovements = async (productId) => {
    const data = await productService.getProductMovements(productId);
    setMovements(Array.isArray(data) ? data : (data?.data ?? []));
  };

  const confirmVoidMovement = async (voidReason) => {
    if (!voidMovement || !historyModal) return;
    setIsVoiding(true);
    setMovementsError('');
    try {
      await productService.voidMovement(voidMovement.id, { voidReason });
      setVoidMovement(null);
      setSuccessMessage('Ajuste anulado correctamente.');
      await reloadMovements(historyModal.id);
      fetchProducts(page, true);
    } catch (err) {
      setMovementsError(err?.message || 'Error al anular el ajuste');
    } finally {
      setIsVoiding(false);
    }
  };

  const goToSell = (product) => {
    navigate(`/payments/new?productId=${product.id}`);
  };

  const exportRows = products.map((p) => ({
    id: p.id,
    nombre: p.name,
    categoria: p.category_name || '',
    sku: p.sku || '',
    stock: p.quantity ?? 0,
    min_stock: getProductMinStock(p),
    precio_venta: getProductRetailPrice(p) ?? '',
    precio_costo: getProductCostPrice(p) ?? '',
    activo: isProductActive(p) ? 'Sí' : 'No',
  }));

  const handleExportExcel = () => {
    if (exportRows.length === 0) return;
    const filterParts = [
      searchDebounced ? `Búsqueda: «${searchDebounced}»` : null,
      showLowStockOnly ? 'Solo stock bajo' : null,
      categoryFilter ? `Categoría ID ${categoryFilter}` : null,
      showInactive ? 'Incluye inactivos' : 'Solo activos',
    ].filter(Boolean);
    downloadExcelTable({
      sheetName: 'Inventario',
      title: 'Inventario de productos',
      meta: [`Total: ${exportRows.length} producto(s)`, ...filterParts],
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Nombre', key: 'nombre', emphasis: true },
        { header: 'Categoría', key: 'categoria' },
        { header: 'SKU', key: 'sku' },
        { header: 'Stock', key: 'stock', align: 'right' },
        { header: 'Mín.', key: 'min_stock', align: 'right' },
        {
          header: 'Precio costo',
          accessor: (r) => formatProductCostPrice({ cost_price: r.precio_costo }),
          align: 'right',
        },
        {
          header: 'Precio venta',
          accessor: (r) => formatProductRetailPrice({ retail_price: r.precio_venta }),
          align: 'right',
        },
        { header: 'Activo', key: 'activo', align: 'center' },
      ],
      rows: exportRows,
      fileBase: 'inventario-mrkutz',
    });
  };

  const handleExportPDF = () => {
    if (exportRows.length === 0) return;
    const filterParts = [
      searchDebounced ? `Búsqueda: «${searchDebounced}»` : null,
      showLowStockOnly ? 'Solo stock bajo' : null,
      categoryFilter ? `Categoría ID ${categoryFilter}` : null,
      showInactive ? 'Incluye inactivos' : 'Solo activos',
    ].filter(Boolean);
    downloadTablePDF({
      filename: `inventario-mrkutz-${pdfFileDateSuffix()}.pdf`,
      title: 'Inventario de productos',
      meta: [`Total: ${exportRows.length} producto(s)`, ...filterParts],
      orientation: 'landscape',
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Nombre', key: 'nombre' },
        { header: 'Categoría', key: 'categoria' },
        { header: 'SKU', key: 'sku' },
        { header: 'Stock', key: 'stock', align: 'right' },
        { header: 'Mín.', key: 'min_stock', align: 'right' },
        {
          header: 'Costo',
          accessor: (r) => formatProductCostPrice({ cost_price: r.precio_costo }),
          align: 'right',
        },
        {
          header: 'Venta',
          accessor: (r) => formatProductRetailPrice({ retail_price: r.precio_venta }),
          align: 'right',
        },
        { header: 'Activo', key: 'activo', align: 'center' },
      ],
      rows: exportRows,
    });
  };

  const inlineForm = isFormOpen ? (
    <ProductForm
      embedded
      editId={editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => setFormView(null)}
    />
  ) : null;

  return (
    <div className="page-shell">
      {!isFormOpen && (
        <PageHeader
          title="Inventario"
          subtitle="Productos, stock, movimientos y venta en caja"
          actions={
            <div className="flex flex-wrap gap-2 items-center">
              <AdminExportButtons
                onExcel={handleExportExcel}
                onPdf={handleExportPDF}
                excelDisabled={exportRows.length === 0}
                pdfDisabled={exportRows.length === 0}
              />
              <Link to="/purchases" className="btn-admin-outline w-full sm:w-auto text-sm">
                Compras
              </Link>
              <Link to="/inventory/categories" className="btn-admin-outline w-full sm:w-auto text-sm">
                Categorías
              </Link>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="btn-admin-outline inline-flex items-center gap-2 w-full sm:w-auto text-sm"
              >
                <Upload className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Importar CSV
              </button>
              <button
                type="button"
                onClick={() => setFormView('create')}
                className="btn-admin inline-flex items-center gap-2 w-full sm:w-auto text-sm"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Nuevo producto
              </button>
            </div>
          }
        />
      )}

      {inlineForm}

      {!isFormOpen && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard label="Total productos" value={listTotal} />
            <StatsCard
              label="Stock bajo"
              value={summary.lowStockCount ?? 0}
              sublabel={(summary.lowStockCount ?? 0) > 0 ? 'Revisar alertas' : undefined}
            />
            <StatsCard label="Unidades en stock" value={summary.totalUnits ?? 0} />
            <StatsCard
              label="Valor inventario"
              value={formatInventoryValue(summary.inventoryValue ?? 0)}
              sublabel="Costo × cantidad"
            />
          </div>

          {(summary.lowStockCount ?? 0) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-medium text-amber-800 mb-2">
                {summary.lowStockCount} producto(s) con stock bajo o agotado
              </h3>
              <button type="button" onClick={() => setShowLowStockOnly(true)}
                className="text-sm font-semibold text-amber-800 underline underline-offset-2">
                Ver productos con stock bajo
              </button>
            </div>
          )}

          <DataCard compact>
            <div className="flex flex-col gap-3 pb-3 border-b border-stone-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="input-premium py-2 text-sm w-full"
              />
              <AdminFilterRow className="w-full">
                <FilterSelect
                  label="Categoría"
                  value={categoryFilter || ''}
                  onChange={setCategoryFilter}
                  options={[
                    { id: '', label: 'Todas' },
                    ...categories.map((c) => ({ id: String(c.id), label: c.name })),
                  ]}
                  ariaLabel="Filtrar por categoría"
                />
                <FilterSelect
                  label="Visibilidad"
                  value={showInactive ? 'with_inactive' : 'active_only'}
                  onChange={(v) => setShowInactive(v === 'with_inactive')}
                  options={[
                    { id: 'active_only', label: 'Solo activos' },
                    { id: 'with_inactive', label: 'Incluir inactivos' },
                  ]}
                  ariaLabel="Filtrar por visibilidad"
                />
                <FilterSelect
                  label="Stock"
                  value={showLowStockOnly ? 'low' : 'all'}
                  onChange={(v) => setShowLowStockOnly(v === 'low')}
                  options={[
                    { id: 'all', label: 'Todos' },
                    { id: 'low', label: 'Solo stock bajo' },
                  ]}
                  ariaLabel="Filtrar por stock"
                />
              </AdminFilterRow>
            </div>

            {error && (
              <div className="alert-error text-sm py-2 mb-3" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-10 text-center text-stone-500">
                <div className="inline-block h-6 w-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm">Cargando inventario…</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-stone-500 mb-3">
                  {searchDebounced || showLowStockOnly || categoryFilter
                    ? 'No hay productos que coincidan con los filtros.'
                    : 'No hay productos registrados.'}
                </p>
                <button type="button" onClick={() => setFormView('create')} className="btn-admin text-sm">
                  Registrar primer producto
                </button>
              </div>
            ) : (
              <>
                <AdminPagination
                  idPrefix="inventory"
                  page={safePage}
                  pageSize={pageSize}
                  total={listTotal}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  itemLabel={`producto${listTotal !== 1 ? 's' : ''}`}
                  showSummary
                  layout="bar"
                />

                <Table>
                  <TableHead>
                    <TableHeader>Producto</TableHeader>
                    <TableHeader>Categoría</TableHeader>
                    <TableHeader>SKU</TableHeader>
                    <TableHeader>Costo</TableHeader>
                    <TableHeader>P. venta</TableHeader>
                    <TableHeader>Margen</TableHeader>
                    <TableHeader>Stock</TableHeader>
                    <TableHeader>Mínimo</TableHeader>
                    <TableHeader>Acciones</TableHeader>
                  </TableHead>
                  <TableBody>
                    {products.map((p) => {
                      const low = isLowStock(p);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            <button
                              type="button"
                              onClick={() => setFormView(p.id)}
                              className="font-medium text-barber-dark hover:text-gold transition-colors text-left"
                            >
                              {p.name}
                            </button>
                            {!isProductActive(p) && (
                              <span className="ml-2 text-xs text-stone-500">(inactivo)</span>
                            )}
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            {p.category_name || '—'}
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>{p.sku || '—'}</TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            {formatProductCostPrice(p)}
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            {formatProductRetailPrice(p)}
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            {formatProductMargin(p)}
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold min-w-[2rem] ${low ? 'text-amber-600' : ''}`}>
                                {p.quantity ?? 0} {formatProductUnit(p.unit, p.quantity)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickStock(p, 1)}
                                disabled={quickUpdating === p.id || !isProductActive(p)}
                                className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm disabled:opacity-50"
                                title="+1 entrada"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(p)}
                                disabled={!isProductActive(p)}
                                className="text-xs text-stone-500 hover:text-stone-700 disabled:opacity-40"
                                title="Ajustar cantidad"
                              >
                                ±
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            {getProductMinStock(p)}
                          </TableCell>
                          <TableCell className={low ? 'bg-amber-50/50' : ''}>
                            <div className="inline-flex items-center gap-1.5">
                              <AdminIconButton
                                icon={Pencil}
                                label="Editar producto"
                                onClick={() => setFormView(p.id)}
                              />
                              <AdminIconButton
                                icon={ShoppingCart}
                                label="Vender producto"
                                onClick={() => goToSell(p)}
                                disabled={(p.quantity ?? 0) <= 0 || !isProductActive(p)}
                              />
                              <AdminIconButton
                                icon={History}
                                label="Historial de movimientos"
                                onClick={() => handleOpenHistory(p)}
                              />
                              <AdminIconButton
                                icon={SlidersHorizontal}
                                label="Ajustar stock"
                                onClick={() => handleOpenAdjust(p)}
                                disabled={!isProductActive(p)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </DataCard>
        </>
      )}

      <AdjustStockModal
        product={adjustModal}
        adjustQty={adjustQty}
        onQtyChange={setAdjustQty}
        onAdd={() => handleSaveAdjust(true)}
        onSubtract={() => handleSaveAdjust(false)}
        onClose={() => setAdjustModal(null)}
        isSaving={adjustSaving}
      />

      <MovementHistoryModal
        product={historyModal}
        movements={movements}
        loading={movementsLoading}
        error={movementsError}
        onVoidClick={(m) => setVoidMovement(m)}
        onClose={() => {
          setHistoryModal(null);
          setMovementsError('');
          setVoidMovement(null);
        }}
      />

      <VoidMovementModal
        movement={voidMovement}
        onClose={() => setVoidMovement(null)}
        onConfirm={confirmVoidMovement}
        isSubmitting={isVoiding}
      />

      {importOpen && (
        <ImportProductsModal
          onClose={() => setImportOpen(false)}
          onSuccess={(data) => {
            const created = data?.created ?? 0;
            const failed = data?.failed ?? 0;
            setSuccessMessage(
              failed > 0
                ? `Importación: ${created} creado(s), ${failed} con error.`
                : `${created} producto(s) importado(s).`
            );
            fetchProducts(page, true);
          }}
        />
      )}

      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
    </div>
  );
}
