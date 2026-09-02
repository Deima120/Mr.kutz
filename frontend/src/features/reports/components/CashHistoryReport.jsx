/**
 * Historial de caja — datos reales vía /cash-registers/history.
 */

import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import * as cashRegisterService from '@/features/cash-registers/services/cashRegisterService';
import CashRegisterDetailModal from '@/features/reports/components/CashRegisterDetailModal';
import CashLivePanel from '@/features/reports/components/CashLivePanel';
import CashRegisterStatusBadge from '@/features/cash-registers/components/CashRegisterStatusBadge';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
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
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

const STATUS_SEGMENTS = [
  { id: '', label: 'Todos' },
  { id: 'OPEN', label: 'Abiertas' },
  { id: 'CLOSED', label: 'Cerradas' },
];

function formatYmd(ymd) {
  if (!ymd) return '—';
  return formatDisplayDate(`${ymd}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CashHistoryReport() {
  const toast = useAppToast();
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      return;
    }
    setLoading(true);
    try {
      const result = await cashRegisterService.getHistory({
        dateFrom,
        dateTo,
        status: status || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setRows(result.registers || []);
      setTotal(result.total || 0);
      setTotals(result.totals || null);
    } catch (err) {
      toast.error(err?.message || 'No se pudo cargar el historial de caja');
      setRows([]);
      setTotal(0);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, status, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, status, pageSize]);

  const exportRows = rows.map((r) => ({
    id: r.id,
    fecha: r.businessDate,
    estado: r.status,
    base: formatMoney(r.openingAmount),
    contado: r.countedCash != null ? formatMoney(r.countedCash) : '—',
    abierta_por: r.openedByEmail || '—',
    cerrada_por: r.closedByEmail || '—',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Día' },
    { key: 'estado', header: 'Estado' },
    { key: 'base', header: 'Base' },
    { key: 'contado', header: 'Contado' },
    { key: 'abierta_por', header: 'Abierta por' },
    { key: 'cerrada_por', header: 'Cerrada por' },
  ];

  return (
    <div className="space-y-4">
      <CashLivePanel />

      <AdminFilterRow>
        <AdminFilterDate
          id="cash-from"
          label="Desde"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <AdminFilterDate
          id="cash-to"
          label="Hasta"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <FilterSelect label="Estado" options={STATUS_SEGMENTS} value={status} onChange={setStatus} />
        <AdminExportButtons
          onExcel={() =>
            downloadExcelTable({
              fileBase: `historial-caja-${pdfFileDateSuffix()}`,
              sheetName: 'Caja',
              title: 'Historial de caja',
              columns,
              rows: exportRows,
            })
          }
          onPdf={() =>
            downloadTablePDF({
              filename: `historial-caja-${pdfFileDateSuffix()}.pdf`,
              title: 'Historial de caja',
              columns,
              rows: exportRows,
            })
          }
        />
      </AdminFilterRow>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard title="Sesiones">
          <p className="text-2xl font-semibold text-stone-800">{totals?.registerCount ?? total}</p>
        </DataCard>
        <DataCard title="Abiertas / Cerradas">
          <p className="text-2xl font-semibold text-stone-800">
            {totals?.openCount ?? 0} / {totals?.closedCount ?? 0}
          </p>
        </DataCard>
        <DataCard title="Suma bases">
          <p className="text-2xl font-semibold text-gold">
            {formatMoney(totals?.openingAmountSum ?? 0)}
          </p>
        </DataCard>
        <DataCard title="Suma contado">
          <p className="text-2xl font-semibold text-stone-800">
            {formatMoney(totals?.countedCashSum ?? 0)}
          </p>
        </DataCard>
      </div>

      <DataCard title="Sesiones de caja">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">Sin cajas en el periodo filtrado.</p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Día</TableHeader>
                <TableHeader>Estado</TableHeader>
                <TableHeader align="right">Base</TableHeader>
                <TableHeader align="right">Contado</TableHeader>
                <TableHeader>Abierta por</TableHeader>
                <TableHeader>Notas</TableHeader>
                <TableHeader align="right"> </TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatYmd(r.businessDate)}
                    </TableCell>
                    <TableCell>
                      <CashRegisterStatusBadge register={r} />
                    </TableCell>
                    <TableCell align="right">{formatMoney(r.openingAmount)}</TableCell>
                    <TableCell align="right">
                      {r.countedCash != null ? formatMoney(r.countedCash) : '—'}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[10rem]">
                      {r.openedByEmail || '—'}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[12rem]">{r.notes || '—'}</TableCell>
                    <TableCell align="right" compact>
                      <AdminIconButton
                        icon={Eye}
                        label="Ver detalle"
                        onClick={() => setDetailId(r.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination
              idPrefix="cash-report"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="cajas"
            />
          </>
        )}
      </DataCard>

      {detailId ? (
        <CashRegisterDetailModal registerId={detailId} onClose={() => setDetailId(null)} />
      ) : null}
    </div>
  );
}
