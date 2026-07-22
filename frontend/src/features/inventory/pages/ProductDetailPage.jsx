/**
 * Ficha de producto: catálogo, stock, costo, kardex, órdenes, recepciones y proveedores.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  History,
  Package,
  Pencil,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import * as productService from '@/features/inventory/services/productService';
import SupplierFormModal from '@/features/suppliers/components/SupplierFormModal';
import {
  MOVEMENT_LABELS,
  formatMovementDate,
  formatProductCostPrice,
  formatProductMargin,
  formatProductRetailPrice,
  formatProductUnit,
  getMovementReference,
  getProductMinStock,
  isLowStock,
  isMovementVoided,
  isProductActive,
} from '@/features/inventory/utils/productFormatters';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import { AdminBackNav } from '@/shared/components/admin/AdminFormShell';
import { AdminPagination } from '@/shared/components/admin/AdminListControls';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import StatsCard from '@/shared/components/admin/StatsCard';
import SuccessToast from '@/shared/components/SuccessToast';
import {
  KARDEX_DEFAULT_PAGE_SIZE,
  KARDEX_PAGE_SIZE_OPTIONS,
  clampKardexPage,
  kardexOffset,
} from '@/features/inventory/utils/kardexPagination';

const ORDER_STATUS = {
  draft: 'Borrador',
  ordered: 'Ordenada',
  partially_received: 'Parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};
function money(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-stone-100 last:border-0">
      <span className="text-[11px] font-semibold text-stone-500 shrink-0">{label}</span>
      <span className="text-sm text-stone-900 text-right break-words">{value ?? '—'}</span>
    </div>
  );
}

function EmptyBlock({ children }) {
  return <p className="text-sm text-stone-500 py-4 text-center">{children}</p>;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [archiving, setArchiving] = useState(false);

  const [movements, setMovements] = useState([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [kardexPage, setKardexPage] = useState(1);
  const [kardexPageSize, setKardexPageSize] = useState(KARDEX_DEFAULT_PAGE_SIZE);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexError, setKardexError] = useState('');
  const [editSupplierId, setEditSupplierId] = useState(null);

  const loadDossier = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await productService.getProductDossier(id);
      setDossier(data);
    } catch (err) {
      setDossier(null);
      setError(getApiErrorMessage(err, 'No se pudo cargar la ficha del producto.'));
    } finally {
      setLoading(false);
    }
  };

  const loadKardex = async (page = kardexPage, pageSize = kardexPageSize) => {
    setKardexLoading(true);
    setKardexError('');
    try {
      const offset = kardexOffset(page, pageSize);
      const result = await productService.getProductMovements(id, { limit: pageSize, offset });
      setMovements(result.data);
      setMovementsTotal(result.total);
      const safePage = clampKardexPage(page, result.total, pageSize);
      if (safePage !== page) {
        setKardexPage(safePage);
      }
    } catch (err) {
      setMovements([]);
      setMovementsTotal(0);
      setKardexError(getApiErrorMessage(err, 'No se pudo cargar el kardex.'));
    } finally {
      setKardexLoading(false);
    }
  };

  useEffect(() => {
    setKardexPage(1);
    loadDossier();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadKardex(kardexPage, kardexPageSize);
  }, [id, kardexPage, kardexPageSize]);

  const handleArchive = async () => {
    const product = dossier?.product;
    if (!product) return;
    if ((product.quantity ?? 0) > 0) {
      setError('No se puede archivar un producto con stock. Recibe o liquida el inventario primero.');
      return;
    }
    if (!window.confirm(`¿Archivar «${product.name}»?`)) return;
    setArchiving(true);
    setError('');
    try {
      await productService.updateProduct(product.id, { isActive: false });
      setSuccessMessage('Producto archivado.');
      await loadDossier();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo archivar.'));
    } finally {
      setArchiving(false);
    }
  };

  const handleKardexPageSize = (size) => {
    setKardexPageSize(size);
    setKardexPage(1);
  };

  if (loading) {
    return (
      <div className="page-shell py-16 text-center text-stone-500">
        <div className="inline-block h-7 w-7 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Cargando ficha…</p>
      </div>
    );
  }

  if (error && !dossier) {
    return (
      <div className="page-shell max-w-md mx-auto py-12 text-center">
        <AdminBackNav to="/inventory" label="Inventario" />
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 shadow-card">
          <Package className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <p className="font-semibold text-stone-800 mb-2">{error}</p>
          <Link to="/inventory" className="btn-admin text-sm inline-flex mt-2">
            Volver al inventario
          </Link>
        </div>
      </div>
    );
  }

  const product = dossier.product;
  const cost = dossier.costSummary || {};
  const active = isProductActive(product);
  const low = isLowStock(product);
  const qty = product.quantity ?? 0;
  const minStock = getProductMinStock(product);

  return (
    <div className="page-shell">
      <div className="mb-2">
        <AdminBackNav to="/inventory" label="Inventario" />
      </div>

      <PageHeader
        title={product.name}
        subtitle={[product.sku, product.categoryName].filter(Boolean).join(' · ') || 'Ficha de producto'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/purchases?new=1&productId=${product.id}`}
              className="btn-admin-outline text-sm inline-flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden />
              Agregar a orden
            </Link>
            <button
              type="button"
              onClick={() => navigate(`/inventory/${product.id}/edit`)}
              className="btn-admin text-sm inline-flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" aria-hidden />
              Editar
            </button>
            {active ? (
              <button
                type="button"
                disabled={archiving || qty > 0}
                onClick={handleArchive}
                className="btn-admin-outline text-sm inline-flex items-center gap-1.5 disabled:opacity-40"
                title={qty > 0 ? 'No se puede archivar con stock' : 'Archivar producto'}
              >
                <Archive className="w-4 h-4" aria-hidden />
                Archivar
              </button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="alert-error text-sm py-2" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Stock actual"
          value={`${qty}`}
          sublabel={`${formatProductUnit(product.unit, qty)}${low ? ' · stock bajo' : ''}`}
        />
        <StatsCard label="Stock mínimo" value={String(minStock)} />
        <StatsCard
          label="Costo promedio"
          value={money(cost.catalogAverageCost ?? cost.averageCostFromReceipts)}
          sublabel="Desde recepciones"
        />
        <StatsCard
          label="Precio venta"
          value={formatProductRetailPrice(product)}
          sublabel={`Margen ${formatProductMargin(product)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="Catálogo" compact>
          <MetaRow label="SKU" value={product.sku || '—'} />
          <MetaRow label="Categoría" value={product.categoryName || 'Sin categoría'} />
          <MetaRow label="Unidad" value={product.unit || 'unit'} />
          <MetaRow label="Estado" value={active ? 'Activo' : 'Archivado'} />
          <MetaRow
            label="Descripción"
            value={product.description?.trim() ? product.description : '—'}
          />
        </DataCard>

        <DataCard title="Costo e inventario" compact>
          <MetaRow label="Costo en catálogo" value={formatProductCostPrice(product)} />
          <MetaRow
            label="Promedio de recepciones"
            value={money(cost.averageCostFromReceipts)}
          />
          <MetaRow label="Último costo recibido" value={money(cost.lastUnitCost)} />
          <MetaRow
            label="Última recepción"
            value={cost.lastReceivedAt ? formatMovementDate(cost.lastReceivedAt) : '—'}
          />
          <MetaRow
            label="Unidades recibidas (hist.)"
            value={String(cost.totalReceivedQuantity ?? 0)}
          />
          <MetaRow label="Recepciones" value={String(cost.receiptCount ?? 0)} />
        </DataCard>
      </div>

      <DataCard
        title="Proveedores que lo surtieron"
        compact
        actions={
          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" aria-hidden />
            {dossier.suppliers?.length ?? 0}
          </span>
        }
      >
        {(dossier.suppliers?.length ?? 0) === 0 ? (
          <EmptyBlock>Aún no hay recepciones de este producto.</EmptyBlock>
        ) : (
          <ul className="divide-y divide-stone-100">
            {dossier.suppliers.map((s) => (
              <li key={s.supplierId} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{s.supplierName}</p>
                  <p className="text-[11px] text-stone-500">
                    {s.receiptCount} recepción(es) · {s.totalQuantity} u
                    {s.lastReceivedAt ? ` · última ${formatMovementDate(s.lastReceivedAt)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <p className="text-xs font-semibold text-stone-700 tabular-nums">
                    Último costo {money(s.lastUnitCost)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditSupplierId(s.supplierId)}
                    className="btn-admin-outline text-[11px] py-1 px-2 inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" aria-hidden />
                    Editar
                  </button>
                  <Link
                    to={`/purchases?tab=suppliers&supplierId=${s.supplierId}`}
                    className="btn-admin-outline text-[11px] py-1 px-2"
                  >
                    Ver en Compras
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="Órdenes relacionadas" compact>
          {(dossier.orders?.length ?? 0) === 0 ? (
            <EmptyBlock>Sin órdenes de compra.</EmptyBlock>
          ) : (
            <ul className="space-y-2">
              {dossier.orders.map((o) => (
                <li
                  key={`${o.purchaseId}-${o.createdAt}`}
                  className="rounded-lg border border-stone-100 bg-stone-50/70 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/purchases?purchaseId=${o.purchaseId}`}
                      className="font-semibold text-barber-dark hover:text-gold"
                    >
                      {o.orderNumber || `Orden #${o.purchaseId}`}
                    </Link>
                    <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                      {ORDER_STATUS[o.status] ?? o.status}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-500">
                    {o.supplierName || 'Proveedor'} · pedido {o.quantity} · recibido {o.receivedQuantity} ·{' '}
                    {money(o.unitCost)} c/u
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataCard>

        <DataCard title="Recepciones" compact>
          {(dossier.receipts?.length ?? 0) === 0 ? (
            <EmptyBlock>Sin recepciones registradas.</EmptyBlock>
          ) : (
            <ul className="space-y-2">
              {dossier.receipts.map((r) => (
                <li
                  key={r.receiptId}
                  className="rounded-lg border border-stone-100 bg-stone-50/70 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-900">{r.receiptNumber}</p>
                    <p className="tabular-nums font-medium text-stone-700">
                      +{r.quantity} · {money(r.unitCost)}
                    </p>
                  </div>
                  <p className="mt-1 text-stone-500">
                    {r.supplierName || 'Proveedor'}
                    {r.orderNumber ? ` · ${r.orderNumber}` : ''}
                    {r.receivedAt ? ` · ${formatMovementDate(r.receivedAt)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataCard>
      </div>

      <DataCard
        title="Kardex"
        compact
        actions={
          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
            <History className="w-3.5 h-3.5" aria-hidden />
            {movementsTotal} movimiento{movementsTotal !== 1 ? 's' : ''}
          </span>
        }
      >
        <AdminPagination
          idPrefix="kardex"
          page={kardexPage}
          pageSize={kardexPageSize}
          total={movementsTotal}
          onPageChange={setKardexPage}
          onPageSizeChange={handleKardexPageSize}
          pageSizeOptions={KARDEX_PAGE_SIZE_OPTIONS}
          itemLabel={`movimiento${movementsTotal !== 1 ? 's' : ''}`}
          showSummary
          layout="bar"
          disabled={kardexLoading}
        />

        {kardexError ? (
          <div className="alert-error text-sm py-2 mb-2" role="alert">
            {kardexError}
          </div>
        ) : null}

        {kardexLoading && movements.length === 0 ? (
          <EmptyBlock>Cargando kardex…</EmptyBlock>
        ) : movementsTotal === 0 ? (
          <EmptyBlock>Sin movimientos de stock.</EmptyBlock>
        ) : (
          <ul className={`space-y-3 ${kardexLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            {movements.map((m) => {
              const qtyChange = m.quantityChange ?? m.quantity_change ?? 0;
              const type = m.movementType ?? m.movement_type;
              const voided = isMovementVoided(m);
              const ref = getMovementReference(m);
              return (
                <li
                  key={m.id}
                  className={`flex justify-between gap-3 text-sm border-b border-stone-100 pb-3 last:border-0 ${
                    voided ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold tabular-nums ${
                          qtyChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {qtyChange >= 0 ? '+' : ''}
                        {qtyChange}
                      </span>
                      <span className="text-stone-500">{MOVEMENT_LABELS[type] || type}</span>
                      {voided ? (
                        <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                          Anulado
                        </span>
                      ) : null}
                    </div>
                    {m.notes ? <p className="text-xs text-stone-500 mt-1">{m.notes}</p> : null}
                    {ref ? (
                      <p className="text-xs text-stone-500 mt-1">
                        {ref.label}
                        {ref.supplierName ? ` · ${ref.supplierName}` : ''}
                        {ref.reference ? ` · ${ref.reference}` : ''}
                      </p>
                    ) : null}
                    {(m.createdByEmail || m.created_by_email) && (
                      <p className="text-[11px] text-stone-400 mt-1">
                        Por {m.createdByEmail || m.created_by_email}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400 whitespace-nowrap shrink-0">
                    {formatMovementDate(m.createdAt ?? m.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </DataCard>

      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
      <SupplierFormModal
        open={editSupplierId != null}
        supplierId={editSupplierId}
        onClose={() => setEditSupplierId(null)}
        onSaved={() => {
          setSuccessMessage('Proveedor actualizado.');
          loadDossier();
        }}
      />
    </div>
  );
}
