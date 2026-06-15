/**
 * Compras — listado compacto, filtros, paginación y formulario inline en la misma tarjeta.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Ban } from 'lucide-react';
import * as purchaseService from '@/features/purchases/services/purchaseService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import SuccessToast from '@/shared/components/SuccessToast';
import { PurchaseForm } from '@/features/purchases/components/PurchaseForm';
import PurchaseDetailModal from '@/features/purchases/components/PurchaseDetailModal';
import VoidPurchaseModal from '@/features/purchases/components/VoidPurchaseModal';
import { formatPurchaseAmount, formatPurchaseDate } from '@/features/purchases/utils/purchaseFormatters';
import { downloadCSV, printAsPDF } from '@/shared/utils/export';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'voided', label: 'Anuladas' },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [periodTotal, setPeriodTotal] = useState({ total: 0, count: 0 });

  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [detailPurchase, setDetailPurchase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, statusFilter, search, pageSize]);

  const fetchPurchases = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        dateFrom,
        dateTo,
        limit: pageSize,
        offset: (targetPage - 1) * pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const [listData, totalData] = await Promise.all([
        purchaseService.getPurchases(params),
        purchaseService.getPurchasesTotal({ dateFrom, dateTo }),
      ]);

      setPurchases(listData.purchases ?? []);
      setListTotal(listData.total ?? 0);
      setPeriodTotal(totalData || { total: 0, count: 0 });
    } catch (err) {
      setError(err?.message || 'Error al cargar compras');
      setPurchases([]);
      setListTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, search, pageSize, page]);

  useEffect(() => {
    if (!isFormOpen) fetchPurchases(page);
  }, [fetchPurchases, isFormOpen, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const openDetail = async (row) => {
    setDetailLoading(true);
    try {
      const full = await purchaseService.getPurchaseById(row.id);
      setDetailPurchase(full || row);
    } catch {
      setDetailPurchase(row);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSuccessMessage('Compra registrada correctamente.');
    setPage(1);
    fetchPurchases(1);
  };

  const confirmVoid = async (voidReason) => {
    if (!voidTarget) return;
    setIsVoiding(true);
    try {
      await purchaseService.voidPurchase(voidTarget.id, { voidReason });
      setVoidTarget(null);
      setSuccessMessage('Compra anulada correctamente.');
      await fetchPurchases(page);
    } catch (err) {
      setError(err?.message || 'No se pudo anular la compra');
    } finally {
      setIsVoiding(false);
    }
  };

  const exportRows = purchases.map((p) => ({
    id: p.id,
    proveedor: p.supplier_name || '',
    factura: p.invoice_number || '',
    total: p.total_amount,
    articulos: p.items_count ?? p.items?.length ?? 0,
    estado: p.voided_at ? 'Anulada' : 'Activa',
    fecha: p.created_at,
    notas: p.notes || '',
  }));

  const filterFieldClass = 'input-premium py-1.5 text-xs min-w-0';
  const filterLabelClass = 'text-[11px] font-medium text-stone-500';

  return (
    <div className="page-shell">
      <DataCard compact>
        <div className={`space-y-3 pb-3 border-b border-stone-100 ${isFormOpen ? 'mb-0' : 'mb-3'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 min-w-0 flex-1 max-w-xl">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar proveedor, factura, notas…"
                  disabled={isFormOpen}
                  className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none disabled:opacity-60"
                />
              </div>
              <button type="submit" disabled={isFormOpen} className="btn-admin shrink-0 px-3 text-xs disabled:opacity-60">
                Buscar
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isFormOpen && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-1.5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Periodo activo</p>
                      <p className="font-serif text-base font-medium text-gold tabular-nums leading-tight">
                        {formatPurchaseAmount(periodTotal.total)}
                      </p>
                    </div>
                    <span className="text-[10px] text-stone-500 border-l border-stone-200 pl-2">
                      {periodTotal.count} compra{periodTotal.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <button type="button" onClick={() => downloadCSV('compras.csv', exportRows)} className="btn-admin-outline text-xs py-2 px-3">
                    CSV
                  </button>
                  <button type="button" onClick={printAsPDF} className="btn-admin-outline text-xs py-2 px-3">
                    PDF
                  </button>
                </>
              )}
              {isFormOpen ? (
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-admin-outline text-xs py-2 px-3">
                  Volver al listado
                </button>
              ) : (
                <button type="button" onClick={() => setIsFormOpen(true)} className="btn-admin inline-flex items-center gap-2 text-xs py-2 px-3">
                  <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                  Nueva compra
                </button>
              )}
            </div>
          </div>

          {!isFormOpen && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className={filterLabelClass}>Desde</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={filterFieldClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={filterLabelClass}>Hasta</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={filterFieldClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={filterLabelClass}>Estado</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterFieldClass}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {isFormOpen && <p className="text-xs text-stone-500 pt-1">Nuevo ingreso de inventario</p>}
        </div>

        {isFormOpen ? (
          <div className="pt-3">
            <PurchaseForm contained onSuccess={handleFormSuccess} onCancel={() => setIsFormOpen(false)} />
          </div>
        ) : (
          <>
            {error && (
              <div className="alert-error text-sm py-2 mb-3" role="alert">{error}</div>
            )}

            {loading ? (
              <div className="py-10 text-center text-stone-500">
                <div className="inline-block h-6 w-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm">Cargando compras…</p>
              </div>
            ) : purchases.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-stone-500 mb-3">No hay compras con los filtros seleccionados.</p>
                <button type="button" onClick={() => setIsFormOpen(true)} className="btn-admin text-sm">
                  Registrar primera compra
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 pb-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-stone-500">
                    Página {safePage} de {totalPages} · {listTotal} registro{listTotal !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <label htmlFor="purchases-page-size" className="text-[11px] font-medium text-stone-500 whitespace-nowrap">
                        Por página
                      </label>
                      <select
                        id="purchases-page-size"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs focus:border-gold focus:ring-2 focus:ring-gold/40 outline-none"
                      >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5" role="navigation" aria-label="Paginación">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="text-xs font-semibold text-stone-800 tabular-nums min-w-[2.5rem] text-center">
                        {safePage}/{totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-900 hover:bg-stone-50 disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableHeader compact>ID</TableHeader>
                      <TableHeader compact>Proveedor</TableHeader>
                      <TableHeader compact>Factura</TableHeader>
                      <TableHeader compact>Artículos</TableHeader>
                      <TableHeader compact>Estado</TableHeader>
                      <TableHeader compact>Fecha</TableHeader>
                      <TableHeader compact className="text-right">Total</TableHeader>
                      <TableHeader compact className="w-24" />
                    </TableHead>
                    <TableBody>
                      {purchases.map((p) => {
                        const isVoided = Boolean(p.voided_at);
                        return (
                          <TableRow key={p.id} className={isVoided ? 'opacity-75 bg-stone-50/60' : ''}>
                            <TableCell compact className="text-xs font-mono">#{p.id}</TableCell>
                            <TableCell compact className="text-xs max-w-[10rem] truncate">
                              {p.supplier_name || '—'}
                            </TableCell>
                            <TableCell compact className="text-xs font-mono max-w-[8rem] truncate">
                              {p.invoice_number || '—'}
                            </TableCell>
                            <TableCell compact className="text-xs tabular-nums">
                              {p.items_count ?? p.items?.length ?? '—'}
                            </TableCell>
                            <TableCell compact>
                              <span
                                className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  isVoided
                                    ? 'border-stone-200 bg-stone-100 text-stone-600'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {isVoided ? 'Anulada' : 'Activa'}
                              </span>
                            </TableCell>
                            <TableCell compact className="text-xs whitespace-nowrap">
                              {formatPurchaseDate(p.created_at)}
                            </TableCell>
                            <TableCell
                              compact
                              className={`text-right text-xs font-semibold tabular-nums ${
                                isVoided ? 'text-stone-500 line-through' : 'text-gold'
                              }`}
                            >
                              {formatPurchaseAmount(p.total_amount)}
                            </TableCell>
                            <TableCell compact>
                              <div className="inline-flex items-center gap-1">
                                <AdminIconButton
                                  icon={Eye}
                                  label="Ver detalle"
                                  onClick={() => openDetail(p)}
                                  disabled={detailLoading}
                                />
                                {!isVoided ? (
                                  <AdminIconButton
                                    icon={Ban}
                                    label="Anular compra"
                                    variant="danger"
                                    onClick={() => setVoidTarget(p)}
                                  />
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </DataCard>

      <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} />
      <VoidPurchaseModal
        purchase={voidTarget}
        onClose={() => !isVoiding && setVoidTarget(null)}
        onConfirm={confirmVoid}
        isSubmitting={isVoiding}
      />
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
    </div>
  );
}
