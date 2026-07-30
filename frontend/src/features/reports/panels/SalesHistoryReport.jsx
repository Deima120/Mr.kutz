/**
 * Historial de ventas — datos reales vía /payments.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as paymentService from '@/features/payments/services/paymentService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import {
  AdminPagination,
  AdminFilterDate,
  AdminFilterRow,
  FilterSelect,
} from '@/shared/components/admin/AdminListControls';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { validateQueryDateOrder } from '@/shared/utils/dateRange';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import { formatMoney } from '@/shared/utils/money';
import {
  formatPaymentAmount,
  formatPaymentDateTime,
  formatPaymentMethodsSummary,
  getPaymentClientName,
  getPaymentConcept,
  getPaymentTypeLabel,
  isPaymentVoided,
} from '@/features/payments/utils/paymentFormatters';
import PaymentTypeBadge from '@/features/payments/components/PaymentTypeBadge';

const PAGE_SIZE = 20;
const STATUS_SEGMENTS = [
  { id: '', label: 'Todos' },
  { id: 'active', label: 'Vigentes' },
  { id: 'voided', label: 'Anulados' },
];
const TYPE_SEGMENTS = [
  { id: '', label: 'Todos' },
  { id: 'service', label: 'Servicios' },
  { id: 'product', label: 'Productos' },
  { id: 'cash', label: 'Caja' },
  { id: 'mixed', label: 'Mixtos' },
];

function aggregateMethodSplits(payments) {
  const map = new Map();
  for (const p of payments) {
    if (isPaymentVoided(p)) continue;
    const splits = p.methodSplits || p.method_splits || [];
    for (const s of splits) {
      const id = s.paymentMethodId ?? s.payment_method_id;
      const name = s.paymentMethodName ?? s.payment_method_name ?? `Método ${id}`;
      const amount = Number(s.amount) || 0;
      const prev = map.get(id) || { paymentMethodId: id, name, amount: 0 };
      prev.amount += amount;
      map.set(id, prev);
    }
  }
  return [...map.values()].sort((a, b) => a.paymentMethodId - b.paymentMethodId);
}

export default function SalesHistoryReport() {
  const toast = useAppToast();
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [status, setStatus] = useState('active');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [periodTotal, setPeriodTotal] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      return;
    }
    setLoading(true);
    try {
      const params = {
        dateFrom,
        dateTo,
        status: status || undefined,
        type: type || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      const [list, totals] = await Promise.all([
        paymentService.getPayments(params),
        paymentService.getPaymentsTotal({ dateFrom, dateTo }),
      ]);
      setRows(list.payments || []);
      setTotal(list.total || 0);
      setPeriodTotal({
        total: Number(totals?.total) || 0,
        count: Number(totals?.count) || 0,
      });
    } catch (err) {
      toast.error(err?.message || 'No se pudo cargar el historial de ventas');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, status, type, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, status, type, pageSize]);

  const methodBreakdown = useMemo(() => aggregateMethodSplits(rows), [rows]);

  const exportRows = rows.map((p) => ({
    id: p.id,
    fecha: formatPaymentDateTime(p.createdAt || p.created_at),
    cliente: getPaymentClientName(p),
    concepto: getPaymentConcept(p),
    tipo: getPaymentTypeLabel(p),
    metodos: formatPaymentMethodsSummary(p),
    monto: formatPaymentAmount(p.amount),
    estado: isPaymentVoided(p) ? 'Anulado' : 'Vigente',
    folio: p.reference || '',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'concepto', header: 'Concepto' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'metodos', header: 'Métodos' },
    { key: 'monto', header: 'Monto' },
    { key: 'estado', header: 'Estado' },
    { key: 'folio', header: 'Folio' },
  ];

  return (
    <div className="space-y-4">
      <AdminFilterRow>
        <AdminFilterDate
          id="sales-from"
          label="Desde"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <AdminFilterDate
          id="sales-to"
          label="Hasta"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <FilterSelect label="Estado" options={STATUS_SEGMENTS} value={status} onChange={setStatus} />
        <FilterSelect label="Tipo" options={TYPE_SEGMENTS} value={type} onChange={setType} />
        <AdminExportButtons
          onExcel={() =>
            downloadExcelTable({
              fileBase: `historial-ventas-${pdfFileDateSuffix()}`,
              sheetName: 'Ventas',
              title: 'Historial de ventas',
              columns,
              rows: exportRows,
            })
          }
          onPdf={() =>
            downloadTablePDF({
              filename: `historial-ventas-${pdfFileDateSuffix()}.pdf`,
              title: 'Historial de ventas',
              columns,
              rows: exportRows,
            })
          }
        />
      </AdminFilterRow>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DataCard title="Total periodo (vigentes)">
          <p className="text-2xl font-semibold text-gold">{formatMoney(periodTotal.total)}</p>
          <p className="text-xs text-stone-500 mt-1">{periodTotal.count} cobro(s)</p>
        </DataCard>
        <DataCard title="Filas en esta página">
          <p className="text-2xl font-semibold text-stone-800">{rows.length}</p>
          <p className="text-xs text-stone-500 mt-1">de {total} en el filtro</p>
        </DataCard>
        <DataCard title="Desglose métodos (página)">
          {methodBreakdown.length ? (
            <ul className="text-sm space-y-1">
              {methodBreakdown.map((m) => (
                <li key={m.paymentMethodId} className="flex justify-between gap-2">
                  <span className="truncate text-stone-600">{m.name}</span>
                  <span className="font-semibold shrink-0">{formatMoney(m.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Sin splits en la página</p>
          )}
        </DataCard>
      </div>

      <DataCard title="Cobros">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">Sin cobros en el periodo filtrado.</p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Fecha</TableHeader>
                <TableHeader>Cliente</TableHeader>
                <TableHeader>Concepto</TableHeader>
                <TableHeader>Tipo</TableHeader>
                <TableHeader>Métodos</TableHeader>
                <TableHeader align="right">Monto</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className={isPaymentVoided(p) ? 'opacity-60' : ''}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatPaymentDateTime(p.createdAt || p.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{getPaymentClientName(p)}</TableCell>
                    <TableCell className="text-sm max-w-[12rem] truncate">{getPaymentConcept(p)}</TableCell>
                    <TableCell>
                      <PaymentTypeBadge payment={p} />
                    </TableCell>
                    <TableCell className="text-xs">{formatPaymentMethodsSummary(p)}</TableCell>
                    <TableCell align="right" className="font-semibold">
                      {formatPaymentAmount(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination
              idPrefix="sales-report"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="cobros"
            />
          </>
        )}
      </DataCard>
    </div>
  );
}
