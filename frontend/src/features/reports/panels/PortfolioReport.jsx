/**
 * Cartera operativa — citas completed sin cobro (opción A).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as portfolioService from '@/features/portfolio/services/portfolioService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import { AdminFilterDate, AdminFilterRow } from '@/shared/components/admin/AdminListControls';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { validateQueryDateOrder } from '@/shared/utils/dateRange';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import { formatMoney } from '@/shared/utils/money';
import { getApiErrorMessage } from '@/shared/utils/formValidation';

export default function PortfolioReport() {
  const toast = useAppToast();
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [totalEstimated, setTotalEstimated] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      return;
    }
    setLoading(true);
    try {
      const result = await portfolioService.getPortfolio({ dateFrom, dateTo });
      setRows(result.appointments || []);
      setCount(result.count ?? result.appointments?.length ?? 0);
      setTotalEstimated(result.totalEstimated ?? 0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar la cartera'));
      setRows([]);
      setCount(0);
      setTotalEstimated(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const exportRows = rows.map((a) => ({
    id: a.id ?? a.appointmentId,
    fecha: a.appointmentDate,
    hora: a.startTime || '',
    cliente: a.clientName || '',
    servicio: a.serviceName || '',
    barbero: a.barberName || '',
    estimado: formatMoney(a.estimatedAmount),
  }));

  const columns = [
    { key: 'id', header: 'Cita' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'hora', header: 'Hora' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'servicio', header: 'Servicio' },
    { key: 'barbero', header: 'Barbero' },
    { key: 'estimado', header: 'Estimado' },
  ];

  return (
    <div className="space-y-4">
      <AdminFilterRow>
        <AdminFilterDate id="port-from" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <AdminFilterDate id="port-to" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <AdminExportButtons
          onExcel={() =>
            downloadExcelTable({
              fileBase: `cartera-${pdfFileDateSuffix()}`,
              sheetName: 'Cartera',
              title: 'Citas completadas sin cobro',
              columns,
              rows: exportRows,
            })
          }
          onPdf={() =>
            downloadTablePDF({
              filename: `cartera-${pdfFileDateSuffix()}.pdf`,
              title: 'Citas completadas sin cobro',
              columns,
              rows: exportRows,
            })
          }
        />
      </AdminFilterRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <DataCard title="Citas pendientes de cobro">
          <p className="text-2xl font-semibold text-stone-800">{count}</p>
        </DataCard>
        <DataCard title="Monto estimado">
          <p className="text-2xl font-semibold text-gold">{formatMoney(totalEstimated)}</p>
          <p className="text-xs text-stone-500 mt-1">Informativo (precio servicio), no es deuda contable.</p>
        </DataCard>
      </div>

      <DataCard title="Cartera operativa">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">No hay citas completadas sin cobro en el periodo.</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Fecha</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Servicio</TableHeader>
              <TableHeader align="right">Estimado</TableHeader>
              <TableHeader></TableHeader>
            </TableHead>
            <TableBody>
              {rows.map((a) => {
                const id = a.id ?? a.appointmentId;
                return (
                  <TableRow key={id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {a.appointmentDate}
                      {a.startTime ? ` ${a.startTime}` : ''}
                    </TableCell>
                    <TableCell className="text-sm">{a.clientName || '—'}</TableCell>
                    <TableCell className="text-sm">{a.serviceName || '—'}</TableCell>
                    <TableCell align="right">{formatMoney(a.estimatedAmount)}</TableCell>
                    <TableCell>
                      <Link
                        to={`/payments?create=1&appointmentId=${id}`}
                        className="text-xs font-semibold text-gold hover:underline"
                      >
                        Cobrar
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
