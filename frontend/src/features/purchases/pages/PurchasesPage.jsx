/**
 * Compras — listado compacto, filtros, paginación y formulario inline en la misma tarjeta.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Ban, PackageCheck, Send } from 'lucide-react';
import * as purchaseService from '@/features/purchases/services/purchaseService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import { AdminPagination, AdminFilterDate, AdminFilterRow, FilterSelect } from '@/shared/components/admin/AdminListControls';
import SuccessToast from '@/shared/components/SuccessToast';
import { PurchaseForm } from '@/features/purchases/components/PurchaseForm';
import PurchaseDetailModal from '@/features/purchases/components/PurchaseDetailModal';
import VoidPurchaseModal from '@/features/purchases/components/VoidPurchaseModal';
import PurchaseReceiptModal from '@/features/purchases/components/PurchaseReceiptModal';
import { formatPurchaseAmount, formatPurchaseDate } from '@/features/purchases/utils/purchaseFormatters';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'ordered', label: 'Ordenadas' },
  { value: 'partially_received', label: 'Recepción parcial' },
  { value: 'received', label: 'Recibidas' },
  { value: 'cancelled', label: 'Canceladas' },
];
const STATUS_SEGMENTS = STATUS_OPTIONS.map((o) => ({ id: o.value, label: o.label }));
const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option.label]));
const getStatus = (purchase) => purchase.status ?? (purchase.voided_at ? 'cancelled' : 'ordered');
const getReceived = (item) => Number(item?.receivedQuantity ?? item?.received_quantity ?? 0);

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
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
    setSuccessMessage('Orden creada. El stock no cambió.');
    setPage(1);
    fetchPurchases(1);
  };

  const confirmVoid = async (reason) => {
    if (!voidTarget) return;
    setIsVoiding(true);
    try {
      await purchaseService.cancelPurchase(voidTarget.id, { reason });
      setVoidTarget(null);
      setSuccessMessage('Orden cancelada correctamente.');
      await fetchPurchases(page);
    } catch (err) {
      setError(err?.message || 'No se pudo anular la compra');
    } finally {
      setIsVoiding(false);
    }
  };

  const submitOrder = async (purchase) => {
    setActionLoadingId(purchase.id);
    setError('');
    try {
      await purchaseService.submitPurchase(purchase.id);
      setSuccessMessage('Orden enviada correctamente.');
      await fetchPurchases(page);
    } catch (err) {
      setError(err?.message || 'No se pudo enviar la orden.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openReceipt = async (purchase) => {
    setActionLoadingId(purchase.id);
    setError('');
    try {
      setReceiptTarget(await purchaseService.getPurchaseById(purchase.id));
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la orden para recibirla.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReceiptSuccess = async () => {
    setReceiptTarget(null);
    setSuccessMessage('Recepción registrada y stock actualizado.');
    await fetchPurchases(page);
  };

  const exportRows = purchases.map((p) => ({
    id: p.id,
    proveedor: p.supplier?.name ?? p.supplier_name ?? '',
    factura: p.invoiceNumber ?? p.invoice_number ?? '',
    total: p.totalAmount ?? p.total_amount,
    articulos: p.items_count ?? p.items?.length ?? 0,
    estado: STATUS_LABELS[getStatus(p)] ?? getStatus(p),
    fecha: p.createdAt ?? p.created_at,
    notas: p.notes || '',
  }));

  const handleExportExcel = () => {
    if (exportRows.length === 0) return;
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Todas';
    downloadExcelTable({
      sheetName: 'Compras',
      title: 'Registro de compras',
      meta: [
        `Periodo: ${dateFrom} — ${dateTo}`,
        `Total en listado: ${exportRows.length}`,
        `Estado: ${statusLabel}`,
        search ? `Búsqueda: «${search}»` : null,
        `Total activo del periodo: ${formatPurchaseAmount(periodTotal.total)} (${periodTotal.count} compras)`,
      ],
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Proveedor', key: 'proveedor', emphasis: true },
        { header: 'Factura', key: 'factura' },
        { header: 'Total', accessor: (r) => formatPurchaseAmount(r.total), align: 'right' },
        { header: 'Ítems', key: 'articulos', align: 'right' },
        { header: 'Estado', key: 'estado', align: 'center' },
        { header: 'Fecha', accessor: (r) => formatPurchaseDate(r.fecha) },
        { header: 'Notas', key: 'notas' },
      ],
      rows: exportRows,
      fileBase: 'compras-mrkutz',
    });
  };

  const handleExportPDF = () => {
    if (exportRows.length === 0) return;
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Todas';
    downloadTablePDF({
      filename: `compras-mrkutz-${pdfFileDateSuffix()}.pdf`,
      title: 'Registro de compras',
      subtitle: `Periodo: ${dateFrom} — ${dateTo}`,
      meta: [
        `Total en listado: ${exportRows.length}`,
        `Estado: ${statusLabel}`,
        search ? `Búsqueda: «${search}»` : null,
        `Total activo del periodo: ${formatPurchaseAmount(periodTotal.total)} (${periodTotal.count} compras)`,
      ],
      orientation: 'landscape',
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Proveedor', key: 'proveedor' },
        { header: 'Factura', key: 'factura' },
        {
          header: 'Total',
          accessor: (r) => formatPurchaseAmount(r.total),
          align: 'right',
        },
        { header: 'Ítems', key: 'articulos', align: 'right' },
        { header: 'Estado', key: 'estado', align: 'center' },
        {
          header: 'Fecha',
          accessor: (r) => formatPurchaseDate(r.fecha),
        },
        { header: 'Notas', key: 'notas' },
      ],
      rows: exportRows,
    });
  };

  return (
    <div className="page-shell">
      {isFormOpen ? (
        <PurchaseForm contained onSuccess={handleFormSuccess} onCancel={() => setIsFormOpen(false)} />
      ) : (
      <DataCard compact>
        <div className="space-y-3 pb-3 border-b border-stone-100 mb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 min-w-0 flex-1 max-w-xl">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar proveedor, factura, notas…"
                  className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none"
                />
              </div>
              <button type="submit" className="btn-admin shrink-0 px-3 text-xs">
                Buscar
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              <AdminExportButtons
                onExcel={handleExportExcel}
                onPdf={handleExportPDF}
                excelDisabled={exportRows.length === 0}
                pdfDisabled={exportRows.length === 0}
                size="xs"
              />
              <button type="button" onClick={() => setIsFormOpen(true)} className="btn-admin inline-flex items-center gap-2 text-xs py-2 px-3">
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Nueva orden
              </button>
              <Link to="/suppliers" className="btn-admin-outline text-xs py-2 px-3">
                Proveedores
              </Link>
            </div>
          </div>

          <AdminFilterRow>
            <AdminFilterDate id="purchases-date-from" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <AdminFilterDate id="purchases-date-to" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <FilterSelect
              label="Estado"
              options={STATUS_SEGMENTS}
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Estado de la compra"
            />
          </AdminFilterRow>
        </div>

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
                  Crear primera orden
                </button>
              </div>
            ) : (
              <>
                <AdminPagination
                  idPrefix="purchases"
                  page={safePage}
                  pageSize={pageSize}
                  total={listTotal}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  itemLabel={`registro${listTotal !== 1 ? 's' : ''}`}
                  showSummary
                  layout="bar"
                />

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
                        const status = getStatus(p);
                        const isCancelled = status === 'cancelled';
                        const hasReceipt = (p.items ?? []).some((item) => getReceived(item) > 0)
                          || Number(p.receivedItemsCount ?? p.received_items_count ?? 0) > 0;
                        const canReceive = status === 'ordered' || status === 'partially_received';
                        const canCancel = (status === 'draft' || status === 'ordered') && !hasReceipt;
                        return (
                          <TableRow key={p.id} className={isCancelled ? 'opacity-75 bg-stone-50/60' : ''}>
                            <TableCell compact className="text-xs font-mono">#{p.id}</TableCell>
                            <TableCell compact className="text-xs max-w-[10rem] truncate">
                              {p.supplier?.name ?? p.supplier_name ?? '—'}
                            </TableCell>
                            <TableCell compact className="text-xs font-mono max-w-[8rem] truncate">
                              {p.invoiceNumber ?? p.invoice_number ?? '—'}
                            </TableCell>
                            <TableCell compact className="text-xs tabular-nums">
                              {p.items_count ?? p.items?.length ?? '—'}
                            </TableCell>
                            <TableCell compact>
                              <span
                                className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  isCancelled
                                    ? 'border-stone-200 bg-stone-100 text-stone-600'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {STATUS_LABELS[status] ?? status}
                              </span>
                            </TableCell>
                            <TableCell compact className="text-xs whitespace-nowrap">
                              {formatPurchaseDate(p.createdAt ?? p.created_at)}
                            </TableCell>
                            <TableCell
                              compact
                              className={`text-right text-xs font-semibold tabular-nums ${
                                isCancelled ? 'text-stone-500 line-through' : 'text-gold'
                              }`}
                            >
                              {formatPurchaseAmount(p.totalAmount ?? p.total_amount)}
                            </TableCell>
                            <TableCell compact>
                              <div className="inline-flex items-center gap-1">
                                <AdminIconButton
                                  icon={Eye}
                                  label="Ver detalle"
                                  onClick={() => openDetail(p)}
                                  disabled={detailLoading}
                                />
                                {status === 'draft' ? (
                                  <AdminIconButton
                                    icon={Send}
                                    label="Enviar orden"
                                    onClick={() => submitOrder(p)}
                                    disabled={actionLoadingId === p.id}
                                  />
                                ) : null}
                                {canReceive ? (
                                  <AdminIconButton
                                    icon={PackageCheck}
                                    label="Recibir mercancía"
                                    onClick={() => openReceipt(p)}
                                    disabled={actionLoadingId === p.id}
                                  />
                                ) : null}
                                {canCancel ? (
                                  <AdminIconButton
                                    icon={Ban}
                                    label="Cancelar orden"
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
      </DataCard>
      )}

      <PurchaseDetailModal purchase={detailPurchase} onClose={() => setDetailPurchase(null)} />
      <VoidPurchaseModal
        purchase={voidTarget}
        onClose={() => !isVoiding && setVoidTarget(null)}
        onConfirm={confirmVoid}
        isSubmitting={isVoiding}
      />
      <PurchaseReceiptModal
        purchase={receiptTarget}
        onClose={() => setReceiptTarget(null)}
        onSuccess={handleReceiptSuccess}
      />
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
    </div>
  );
}
