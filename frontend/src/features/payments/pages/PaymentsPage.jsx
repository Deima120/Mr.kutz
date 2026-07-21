/**
 * Listado de pagos — diseño compacto, filtros, paginación y formulario inline.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Eye, Ban } from 'lucide-react';
import * as paymentService from '@/features/payments/services/paymentService';
import { PaymentForm } from '@/features/payments/pages/PaymentFormPage';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import { AdminPagination, AdminFilterDate, AdminFilterRow, FilterSelect } from '@/shared/components/admin/AdminListControls';
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
  getPaymentTypeLabel,
} from '@/features/payments/utils/paymentFormatters';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import { AdminBackNav } from '@/shared/components/admin/AdminFormShell';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Vigentes' },
  { value: 'voided', label: 'Anulados' },
];
const STATUS_SEGMENTS = STATUS_OPTIONS.map((o) => ({ id: o.value, label: o.label }));
const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'service', label: 'Servicios' },
  { value: 'product', label: 'Productos' },
  { value: 'cash', label: 'Caja' },
];
const TYPE_SEGMENTS = TYPE_OPTIONS.map((o) => ({ id: o.value, label: o.label }));

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
  }, [dateFrom, dateTo, statusFilter, typeFilter, methodFilter, pageSize]);

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
  }, [dateFrom, dateTo, statusFilter, typeFilter, methodFilter, pageSize, page]);

  useEffect(() => {
    if (!isFormOpen) fetchPayments(page);
  }, [fetchPayments, isFormOpen, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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

  const handleExportExcel = () => {
    if (exportRows.length === 0) return;
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Todos';
    const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label || 'Todos';
    downloadExcelTable({
      sheetName: 'Pagos',
      title: 'Registro de pagos',
      meta: [
        `Periodo: ${dateFrom} — ${dateTo}`,
        `Total en listado: ${exportRows.length}`,
        `Estado: ${statusLabel} · Tipo: ${typeLabel}`,
        `Total vigente del periodo: ${formatPaymentAmount(periodTotal.total)} (${periodTotal.count} cobros)`,
      ],
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Fecha', accessor: (r) => formatPaymentDateTime(r.fecha) },
        { header: 'Estado', key: 'estado', align: 'center' },
        { header: 'Tipo', accessor: (r) => getPaymentTypeLabel(r.tipo) },
        { header: 'Cliente', key: 'cliente', emphasis: true },
        { header: 'Concepto', key: 'concepto' },
        { header: 'Método', key: 'metodo' },
        { header: 'Monto', accessor: (r) => formatPaymentAmount(r.monto), align: 'right' },
        { header: 'Referencia', key: 'referencia' },
        { header: 'Notas', key: 'notas' },
        { header: 'Motivo anulación', key: 'motivo_anulacion' },
      ],
      rows: exportRows,
      fileBase: 'pagos-mrkutz',
    });
  };

  const handleExportPDF = () => {
    if (exportRows.length === 0) return;
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Todos';
    const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label || 'Todos';
    downloadTablePDF({
      filename: `pagos-mrkutz-${pdfFileDateSuffix()}.pdf`,
      title: 'Registro de pagos',
      subtitle: `Periodo: ${dateFrom} — ${dateTo}`,
      meta: [
        `Total en listado: ${exportRows.length}`,
        `Estado: ${statusLabel} · Tipo: ${typeLabel}`,
        `Total vigente del periodo: ${formatPaymentAmount(periodTotal.total)} (${periodTotal.count} cobros)`,
      ],
      orientation: 'landscape',
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        {
          header: 'Fecha',
          accessor: (r) => formatPaymentDateTime(r.fecha),
        },
        { header: 'Estado', key: 'estado', align: 'center' },
        {
          header: 'Tipo',
          accessor: (r) => getPaymentTypeLabel(r.tipo),
        },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Concepto', key: 'concepto' },
        { header: 'Método', key: 'metodo' },
        {
          header: 'Monto',
          accessor: (r) => formatPaymentAmount(r.monto),
          align: 'right',
        },
        { header: 'Ref.', key: 'referencia' },
      ],
      rows: exportRows,
    });
  };

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

  const methodFilterOptions = [
    { id: '', label: 'Todos' },
    ...methods.map((m) => ({
      id: String(m.id),
      label: formatPaymentMethodName(m.description || m.name),
    })),
  ];

  return (
    <div className="page-shell">
      {isFormOpen && (
        <div className="mb-3">
          <AdminBackNav label="Volver" onClick={closeForm} />
        </div>
      )}

      <DataCard compact>
        {!isFormOpen && (
        <div className="space-y-3 pb-3 border-b border-stone-100 mb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-stretch sm:justify-end">
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
              <AdminExportButtons
                onExcel={handleExportExcel}
                onPdf={handleExportPDF}
                excelDisabled={exportRows.length === 0}
                pdfDisabled={exportRows.length === 0}
                size="xs"
              />
              <button type="button" onClick={openCreateForm} className="btn-admin inline-flex items-center gap-2 text-xs py-2 px-3">
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Registrar pago
              </button>
            </div>
          </div>

          <AdminFilterRow>
            <AdminFilterDate id="payments-date-from" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <AdminFilterDate id="payments-date-to" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <FilterSelect
              label="Estado"
              options={STATUS_SEGMENTS}
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Estado del pago"
            />
            <FilterSelect
              label="Tipo"
              options={TYPE_SEGMENTS}
              value={typeFilter}
              onChange={setTypeFilter}
              ariaLabel="Tipo de pago"
            />
            <FilterSelect
              label="Método"
              value={methodFilter}
              onChange={setMethodFilter}
              options={methodFilterOptions}
              ariaLabel="Método de pago"
            />
          </AdminFilterRow>
        </div>
        )}

        {isFormOpen ? (
          <div>{inlineForm}</div>
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
              <AdminPagination
                idPrefix="payments"
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
