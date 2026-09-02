/**
 * Historial de comisiones — snapshots al cobrar servicios.
 */

import { useCallback, useEffect, useState } from 'react';
import * as commissionService from '@/features/commissions/services/commissionService';
import * as barberService from '@/features/barbers/services/barberService';
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
import { getApiErrorMessage } from '@/shared/utils/formValidation';

export default function CommissionsReport() {
  const toast = useAppToast();
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [barberId, setBarberId] = useState('');
  const [barbers, setBarbers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    barberService
      .getBarbers?.({ limit: 100 })
      .then((r) => {
        const list = Array.isArray(r) ? r : r?.data || r?.barbers || [];
        setBarbers(list);
      })
      .catch(() => setBarbers([]));
  }, []);

  const load = useCallback(async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      return;
    }
    setLoading(true);
    try {
      const result = await commissionService.getCommissions({
        dateFrom,
        dateTo,
        barberId: barberId || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setRows(result.entries || []);
      setTotal(result.total || 0);
      setTotals(result.totals || null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar comisiones'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, barberId, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, barberId, pageSize]);

  const barberOptions = [
    { id: '', label: 'Todos' },
    ...barbers.map((b) => ({
      id: String(b.id),
      label: `${b.firstName || b.first_name || ''} ${b.lastName || b.last_name || ''}`.trim(),
    })),
  ];

  const exportRows = rows.map((e) => ({
    id: e.id,
    barbero: e.barberName || '',
    servicio: formatMoney(e.serviceAmount),
    pct: `${e.commissionPercent}%`,
    comision: formatMoney(e.commissionAmount),
    pago: e.paymentId,
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'barbero', header: 'Barbero' },
    { key: 'servicio', header: 'Servicio' },
    { key: 'pct', header: '%' },
    { key: 'comision', header: 'Comisión' },
    { key: 'pago', header: 'Pago' },
  ];

  return (
    <div className="space-y-4">
      <AdminFilterRow>
        <AdminFilterDate id="com-from" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <AdminFilterDate id="com-to" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <FilterSelect label="Barbero" options={barberOptions} value={barberId} onChange={setBarberId} />
        <AdminExportButtons
          onExcel={() =>
            downloadExcelTable({
              fileBase: `comisiones-${pdfFileDateSuffix()}`,
              sheetName: 'Comisiones',
              title: 'Historial de comisiones',
              columns,
              rows: exportRows,
            })
          }
          onPdf={() =>
            downloadTablePDF({
              filename: `comisiones-${pdfFileDateSuffix()}.pdf`,
              title: 'Historial de comisiones',
              columns,
              rows: exportRows,
            })
          }
        />
      </AdminFilterRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <DataCard title="Total comisiones">
          <p className="text-2xl font-semibold text-gold">
            {formatMoney(totals?.totalCommission ?? 0)}
          </p>
          <p className="text-xs text-stone-500 mt-1">{totals?.count ?? 0} entrada(s)</p>
        </DataCard>
        <DataCard title="Por barbero">
          {(totals?.byBarber || []).length ? (
            <ul className="text-sm space-y-1 max-h-28 overflow-y-auto">
              {totals.byBarber.map((b) => (
                <li key={b.barberId} className="flex justify-between gap-2">
                  <span className="truncate">{b.barberName}</span>
                  <span className="font-semibold shrink-0">{formatMoney(b.totalCommission)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Sin desglose</p>
          )}
        </DataCard>
      </div>

      <DataCard title="Comisiones">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">
            Sin comisiones en el periodo. Se generan al cobrar líneas de servicio.
          </p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Barbero</TableHeader>
                <TableHeader align="right">Servicio</TableHeader>
                <TableHeader align="right">%</TableHeader>
                <TableHeader align="right">Comisión</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} className={e.voidedAt ? 'opacity-60' : ''}>
                    <TableCell className="text-sm">{e.barberName || `#${e.barberId}`}</TableCell>
                    <TableCell align="right">{formatMoney(e.serviceAmount)}</TableCell>
                    <TableCell align="right">{e.commissionPercent}%</TableCell>
                    <TableCell align="right" className="font-semibold">
                      {formatMoney(e.commissionAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination
              idPrefix="com-report"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="comisiones"
            />
          </>
        )}
      </DataCard>
    </div>
  );
}
