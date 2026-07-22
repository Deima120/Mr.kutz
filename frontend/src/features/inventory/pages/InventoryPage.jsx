/**
 * Inventario: listado, edición embebida, ajustes y venta vía pagos.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import { ProductForm } from '@/features/inventory/components/ProductForm';
import AdjustStockModal from '@/features/inventory/components/AdjustStockModal';
import MovementHistoryModal from '@/features/inventory/components/MovementHistoryModal';
import VoidMovementModal from '@/features/inventory/components/VoidMovementModal';
import ImportProductsModal from '@/features/inventory/components/ImportProductsModal';
import InventoryProductsTable from '@/features/inventory/components/InventoryProductsTable';
import { useInventoryList } from '@/features/inventory/hooks/useInventoryList';
import { useInventoryStock } from '@/features/inventory/hooks/useInventoryStock';
import { MANUAL_STOCK_ADJUST_ENABLED } from '@/features/inventory/inventoryFlags';
import * as productService from '@/features/inventory/services/productService';
import {
  exportInventoryExcel,
  exportInventoryPdf,
  buildInventoryExportRows,
} from '@/features/inventory/utils/inventoryExport';
import { formatInventoryValue } from '@/features/inventory/utils/productFormatters';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import StatsCard from '@/shared/components/admin/StatsCard';
import {
  AdminFilterRow,
  FilterSelect,
} from '@/shared/components/admin/AdminListControls';
import SuccessToast from '@/shared/components/SuccessToast';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';

export default function InventoryPage() {
  const [successMessage, setSuccessMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [archivingId, setArchivingId] = useState(null);

  const list = useInventoryList();
  const stock = useInventoryStock({
    page: list.page,
    fetchProducts: list.fetchProducts,
    setError: list.setError,
    onSuccessMessage: setSuccessMessage,
  });

  const handleFormSuccess = ({ created, updated } = {}) => {
    list.setFormView(null);
    if (created) setSuccessMessage('Producto creado correctamente.');
    if (updated) setSuccessMessage('Producto actualizado correctamente.');
    list.setPage(1);
    list.fetchProducts(1);
  };

  const handleArchive = async (product) => {
    if (!product?.id) return;
    if ((product.quantity ?? 0) > 0) {
      list.setError('No se puede archivar un producto con stock. Recibe o liquida el inventario primero.');
      return;
    }
    if (!window.confirm(`¿Archivar «${product.name}»? Dejará de aparecer en compras y ventas.`)) {
      return;
    }
    setArchivingId(product.id);
    list.setError('');
    try {
      await productService.updateProduct(product.id, { isActive: false });
      setSuccessMessage('Producto archivado.');
      await list.fetchProducts(list.page, true);
    } catch (err) {
      list.setError(getApiErrorMessage(err, 'No se pudo archivar el producto'));
    } finally {
      setArchivingId(null);
    }
  };

  const exportRows = buildInventoryExportRows(list.products);
  const exportCtx = {
    products: list.products,
    searchDebounced: list.searchDebounced,
    showLowStockOnly: list.showLowStockOnly,
    categoryFilter: list.categoryFilter,
    showInactive: list.showInactive,
  };

  const inlineForm = list.isFormOpen ? (
    <ProductForm
      embedded
      editId={list.editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => list.setFormView(null)}
    />
  ) : null;

  return (
    <div className="page-shell">
      {!list.isFormOpen && (
        <PageHeader
          title="Inventario"
          subtitle="Productos, stock, movimientos y venta en caja"
          actions={
            <div className="flex flex-wrap gap-2 items-center">
              <AdminExportButtons
                onExcel={() => exportInventoryExcel(exportCtx)}
                onPdf={() => exportInventoryPdf(exportCtx)}
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
                onClick={() => list.setFormView('create')}
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

      {!list.isFormOpen && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard label="Total productos" value={list.listTotal} />
            <StatsCard
              label="Stock bajo"
              value={list.summary.lowStockCount ?? 0}
              sublabel={(list.summary.lowStockCount ?? 0) > 0 ? 'Revisar alertas' : undefined}
            />
            <StatsCard label="Unidades en stock" value={list.summary.totalUnits ?? 0} />
            <StatsCard
              label="Valor inventario"
              value={formatInventoryValue(list.summary.inventoryValue ?? 0)}
              sublabel="Costo × cantidad"
            />
          </div>

          {(list.summary.lowStockCount ?? 0) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-medium text-amber-800 mb-2">
                {list.summary.lowStockCount} producto(s) con stock bajo o agotado
              </h3>
              <button
                type="button"
                onClick={() => list.setShowLowStockOnly(true)}
                className="text-sm font-semibold text-amber-800 underline underline-offset-2"
              >
                Ver productos con stock bajo
              </button>
            </div>
          )}

          <DataCard compact>
            <div className="flex flex-col gap-3 pb-3 border-b border-stone-100">
              <input
                type="text"
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="input-premium py-2 text-sm w-full"
              />
              <AdminFilterRow className="w-full">
                <FilterSelect
                  label="Categoría"
                  value={list.categoryFilter || ''}
                  onChange={list.setCategoryFilter}
                  options={[
                    { id: '', label: 'Todas' },
                    ...list.categories.map((c) => ({ id: String(c.id), label: c.name })),
                  ]}
                  ariaLabel="Filtrar por categoría"
                />
                <FilterSelect
                  label="Visibilidad"
                  value={list.showInactive ? 'with_inactive' : 'active_only'}
                  onChange={(v) => list.setShowInactive(v === 'with_inactive')}
                  options={[
                    { id: 'active_only', label: 'Solo activos' },
                    { id: 'with_inactive', label: 'Incluir inactivos' },
                  ]}
                  ariaLabel="Filtrar por visibilidad"
                />
                <FilterSelect
                  label="Stock"
                  value={list.showLowStockOnly ? 'low' : 'all'}
                  onChange={(v) => list.setShowLowStockOnly(v === 'low')}
                  options={[
                    { id: 'all', label: 'Todos' },
                    { id: 'low', label: 'Solo stock bajo' },
                  ]}
                  ariaLabel="Filtrar por stock"
                />
              </AdminFilterRow>
            </div>

            {list.error && (
              <div className="alert-error text-sm py-2 mb-3" role="alert">
                {list.error}
              </div>
            )}

            {list.loading ? (
              <div className="py-10 text-center text-stone-500">
                <div className="inline-block h-6 w-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm">Cargando inventario…</p>
              </div>
            ) : list.products.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-stone-500 mb-3">
                  {list.searchDebounced || list.showLowStockOnly || list.categoryFilter
                    ? 'No hay productos que coincidan con los filtros.'
                    : 'No hay productos registrados.'}
                </p>
                <button
                  type="button"
                  onClick={() => list.setFormView('create')}
                  className="btn-admin text-sm"
                >
                  Registrar primer producto
                </button>
              </div>
            ) : (
              <InventoryProductsTable
                products={list.products}
                listTotal={list.listTotal}
                safePage={list.safePage}
                pageSize={list.pageSize}
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
                onEdit={(id) => list.setFormView(id)}
                onAdjust={MANUAL_STOCK_ADJUST_ENABLED ? stock.handleOpenAdjust : undefined}
                onSell={stock.goToSell}
                onHistory={stock.handleOpenHistory}
                onArchive={handleArchive}
                archivingId={archivingId}
              />
            )}
          </DataCard>
        </>
      )}

      {MANUAL_STOCK_ADJUST_ENABLED ? (
        <AdjustStockModal
          product={stock.adjustModal}
          adjustQty={stock.adjustQty}
          onQtyChange={stock.setAdjustQty}
          onAdd={() => stock.handleSaveAdjust(true)}
          onSubtract={() => stock.handleSaveAdjust(false)}
          onClose={stock.closeAdjust}
          isSaving={stock.adjustSaving}
        />
      ) : null}

      <MovementHistoryModal
        product={stock.historyModal}
        movements={stock.movements}
        loading={stock.movementsLoading}
        error={stock.movementsError}
        onVoidClick={(m) => stock.setVoidMovement(m)}
        onClose={stock.closeHistory}
      />

      <VoidMovementModal
        movement={stock.voidMovement}
        onClose={() => stock.setVoidMovement(null)}
        onConfirm={stock.confirmVoidMovement}
        isSubmitting={stock.isVoiding}
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
            list.fetchProducts(list.page, true);
          }}
        />
      )}

      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
    </div>
  );
}
