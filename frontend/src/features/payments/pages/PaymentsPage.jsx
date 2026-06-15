/**
 * Listado de pagos — diseño compacto, filtros, paginación y formulario inline.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Ban } from 'lucide-react';
import * as paymentService from '@/features/payments/services/paymentService';
import { PaymentForm } from '@/features/payments/pages/PaymentFormPage';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import SuccessToast from '@/shared/components/SuccessToast';
import PaymentTypeBadge from '@/features/payments/components/PaymentTypeBadge';
import PaymentDetailModal from '@/features/payments/components/PaymentDetailModal';
import VoidPaymentModal from '@/features/payments/components/VoidPaymentModal';
import {
  formatPaymentAmount,
  formatPaymentDateTime,
  formatPaymentMethodName,
  getPaymentClientName,
  getPaymentConcept,
} from '@/features/payments/utils/paymentFormatters';
import { downloadCSV, printAsPDF } from '@/shared/utils/export';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Vigentes' },
  { value: 'voided', label: 'Anulados' },
];
const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'service', label: 'Servicios' },
  { value: 'product', label: 'Productos' },
  { value: 'cash', label: 'Caja' },
];

function resolveFormViewFromPath(pathname, search) {
  if (pathname === '/payments/new') return 'create';
  const params = new URLSearchParams(search);
  if (pathname === '/payments' && params.get('create') === '1') return 'create';
  return null;
}

function resolvePrefillFromSearch(search) {
  const params = new URLSearchParams(search);
  return {
    productId: params.get('productId'),
    appointmentId: params.get('appointmentId'),
  };
}

export default function PaymentsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [periodTotal, setPeriodTotal] = useState({ total: 0, count: 0 });
  const [methods, setMethods] = useState([]);

  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formView, setFormView] = useState(() => resolveFormViewFromPath(location.pathname, location.search));
  const [paymentPrefill, setPaymentPrefill] = useState(() => resolvePrefillFromSearch(location.search));

  const [detailPayment, setDetailPayment] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const isFormOpen = formView === 'create';
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    const fromPath = resolveFormViewFromPath(location.pathname, location.search);
    if (fromPath === 'create') {
      setPaymentPrefill(resolvePrefillFromSearch(location.search));
      setFormView('create');
      navigate('/payments', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    paymentService.getPaymentMethods().then((m) => setMethods(Array.isArray(m) ? m : []));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, statusFilter, typeFilter, methodFilter, search, pageSize]);

  const fetchPayments = useCallback(async (targetPage = page) => {
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
      if (typeFilter) params.type = typeFilter;
      if (methodFilter) params.paymentMethodId = methodFilter;
      if (search.trim()) params.search = search.trim();

      const [listData, totalData] = await Promise.all([
        paymentService.getPayments(params),
        paymentService.getPaymentsTotal({ dateFrom, dateTo }),
      ]);

      setPayments(listData.payments ?? []);
      setListTotal(listData.total ?? 0);
      setPeriodTotal(totalData || { total: 0, count: 0 });
    } catch (err) {
      setError(err?.message || 'Error al cargar pagos');
      setPayments([]);
      setListTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, typeFilter, methodFilter, search, pageSize, page]);

  useEffect(() => {
    if (!isFormOpen) fetchPayments(page);
  }, [fetchPayments, isFormOpen, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleFormSuccess = () => {
    setFormView(null);
    setPaymentPrefill({ productId: null, appointmentId: null });
    setSuccessMessage('Pago registrado correctamente.');
    setPage(1);
    fetchPayments(1);
  };

  const openCreateForm = () => {
    setPaymentPrefill({ productId: null, appointmentId: null });
    setFormView('create');
  };

  const confirmVoid = async (voidReason) => {
    if (!voidTarget) return;
    setIsVoiding(true);
    try {
      await paymentService.voidPayment(voidTarget.id, { voidReason });
      setVoidTarget(null);
      setSuccessMessage('Pago anulado correctamente.');
      await fetchPayments(page);
    } catch (err) {
      setError(err?.message || 'Error al anular el pago');
    } finally {
      setIsVoiding(false);
    }
  };

  const exportRows = payments.map((p) => ({
    id: p.id,
    fecha: p.created_at,
    estado: p.voided_at ? 'Anulado' : 'Vigente',
    tipo: p.payment_type || (p.product_id ? 'product' : p.appointment_id ? 'service' : 'cash'),
    referencia: p.reference || '',
    cliente: getPaymentClientName(p),
    concepto: getPaymentConcept(p),
    metodo: formatPaymentMethodName(p.payment_method_name),
    monto: p.amount,
    notas: p.notes || '',
    motivo_anulacion: p.void_reason || '',
  }));

  const closeForm = () => {
    setFormView(null);
    setPaymentPrefill({ productId: null, appointmentId: null });
  };

  const inlineForm = isFormOpen ? (
    <PaymentForm
      embedded
      contained
      prefillProductId={paymentPrefill.productId}
      prefillAppointmentId={paymentPrefill.appointmentId}
      onSuccess={handleFormSuccess}
      onCancel={closeForm}
    />
  ) : null;

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
                  placeholder="Buscar ref., cliente, concepto…"
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
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Periodo vigente</p>
                      <p className="font-serif text-base font-medium text-gold tabular-nums leading-tight">
                        {formatPaymentAmount(periodTotal.total)}
                      </p>
                    </div>
                    <span className="text-[10px] text-stone-500 border-l border-stone-200 pl-2">
                      {periodTotal.count} cobro{periodTotal.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <button type="button" onClick={() => downloadCSV('pagos.csv', exportRows)} className="btn-admin-outline text-xs py-2 px-3">
                    CSV
                  </button>
                  <button type="button" onClick={printAsPDF} className="btn-admin-outline text-xs py-2 px-3">
                    PDF
                  </button>
                </>
              )}
              {isFormOpen ? (
                <button type="button" onClick={closeForm} className="btn-admin-outline text-xs py-2 px-3">
                  Volver al listado
                </button>
              ) : (
                <button type="button" onClick={openCreateForm} className="btn-admin inline-flex items-center gap-2 text-xs py-2 px-3">
                  <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                  Registrar pago
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
              <label className="flex flex-col gap-1">
                <span className={filterLabelClass}>Tipo</span>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterFieldClass}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={filterLabelClass}>Método</span>
                <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={`${filterFieldClass} min-w-[7rem]`}>
                  <option value="">Todos</option>
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {formatPaymentMethodName(m.description || m.name)}
                        </option>
                      ))}
                </select>
              </label>
            </div>
          )}

          {isFormOpen && (
            <p className="text-xs text-stone-500 pt-1">Nuevo registro de pago</p>
          )}
        </div>

        {isFormOpen ? (
          <div className="pt-3">{inlineForm}</div>
        ) : (
          <>
            {error && (
              <div className="alert-error text-sm py-2 mb-3" role="alert">{error}</div>
            )}

            {loading ? (
            <div className="py-10 text-center text-stone-500">
              <div className="inline-block h-6 w-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Cargando pagos…</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-stone-500 mb-3">No hay pagos con los filtros seleccionados.</p>
              <button type="button" onClick={openCreateForm} className="btn-admin text-sm">
                Registrar primer pago
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
                      <label htmlFor="payments-page-size" className="text-[11px] font-medium text-stone-500 whitespace-nowrap">
                        Por página
                      </label>
                      <select
                        id="payments-page-size"
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
                      <TableHeader compact>Fecha</TableHeader>
                      <TableHeader compact>Tipo</TableHeader>
                      <TableHeader compact>Estado</TableHeader>
                      <TableHeader compact>Referencia</TableHeader>
                      <TableHeader compact>Cliente</TableHeader>
                      <TableHeader compact>Concepto</TableHeader>
                      <TableHeader compact>Método</TableHeader>
                      <TableHeader compact className="text-right">Monto</TableHeader>
                      <TableHeader compact className="w-24" />
                    </TableHead>
                    <TableBody>
                      {payments.map((p) => {
                        const isVoided = Boolean(p.voided_at);
                        return (
                          <TableRow key={p.id} className={isVoided ? 'opacity-75 bg-stone-50/60' : ''}>
                            <TableCell compact className="text-xs whitespace-nowrap">
                              {formatPaymentDateTime(p.created_at, p.start_time)}
                            </TableCell>
                            <TableCell compact>
                              <PaymentTypeBadge payment={p} />
                            </TableCell>
                            <TableCell compact>
                              <span
                                className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  isVoided
                                    ? 'border-stone-200 bg-stone-100 text-stone-600'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {isVoided ? 'Anulado' : 'Vigente'}
                              </span>
                            </TableCell>
                            <TableCell compact className="text-xs font-mono max-w-[8rem] truncate" title={p.reference || ''}>
                              {p.reference || '—'}
                            </TableCell>
                            <TableCell compact className="text-xs max-w-[9rem] truncate">
                              {getPaymentClientName(p)}
                            </TableCell>
                            <TableCell compact className="text-xs max-w-[12rem] truncate" title={getPaymentConcept(p)}>
                              {getPaymentConcept(p)}
                            </TableCell>
                            <TableCell compact className="text-xs">
                              {formatPaymentMethodName(p.payment_method_name)}
                            </TableCell>
                            <TableCell
                              compact
                              className={`text-right text-xs font-semibold tabular-nums ${
                                isVoided ? 'text-stone-500 line-through' : 'text-gold'
                              }`}
                            >
                              {formatPaymentAmount(p.amount)}
                            </TableCell>
                            <TableCell compact>
                              <div className="inline-flex items-center gap-1">
                                <AdminIconButton
                                  icon={Eye}
                                  label="Ver detalle"
                                  onClick={() => setDetailPayment(p)}
                                />
                                {!isVoided ? (
                                  <AdminIconButton
                                    icon={Ban}
                                    label="Anular pago"
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

      <PaymentDetailModal payment={detailPayment} onClose={() => setDetailPayment(null)} />
      <VoidPaymentModal
        payment={voidTarget}
        onClose={() => !isVoiding && setVoidTarget(null)}
        onConfirm={confirmVoid}
        isSubmitting={isVoiding}
      />
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
    </div>
  );
}
