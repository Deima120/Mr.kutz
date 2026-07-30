/**
 * Historial de otros ingresos — exige caja OPEN al crear.
 */

import { useCallback, useEffect, useState } from 'react';
import * as otherIncomeService from '@/features/other-incomes/services/otherIncomeService';
import * as paymentService from '@/features/payments/services/paymentService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import {
  AdminPagination,
  AdminFilterDate,
  AdminFilterRow,
} from '@/shared/components/admin/AdminListControls';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { validateQueryDateOrder } from '@/shared/utils/dateRange';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import { formatMoney, formatMoneyInputDigits, parseMoneyInput } from '@/shared/utils/money';
import { getApiErrorMessage } from '@/shared/utils/formValidation';

export default function OtherIncomesReport() {
  const toast = useAppToast();
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    description: '',
    paymentMethodId: '',
    notes: '',
  });

  useEffect(() => {
    paymentService
      .getPaymentMethods()
      .then((m) => setMethods(Array.isArray(m) ? m : []))
      .catch(() => setMethods([]));
  }, []);

  const load = useCallback(async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      return;
    }
    setLoading(true);
    try {
      const result = await otherIncomeService.getOtherIncomes({
        dateFrom,
        dateTo,
        status: 'active',
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setRows(result.incomes || []);
      setTotal(result.total || 0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar otros ingresos'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, pageSize]);

  const pageTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const exportRows = rows.map((r) => ({
    id: r.id,
    fecha: r.incomeDate,
    descripcion: r.description,
    metodo: r.paymentMethodName || '',
    monto: formatMoney(r.amount),
    folio: r.reference || '',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'metodo', header: 'Método' },
    { key: 'monto', header: 'Monto' },
    { key: 'folio', header: 'Folio' },
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    const amount = parseMoneyInput(form.amount);
    if (!form.description.trim() || !form.paymentMethodId || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Completa descripción, método y monto.');
      return;
    }
    setSaving(true);
    try {
      await otherIncomeService.createOtherIncome({
        amount,
        description: form.description.trim(),
        paymentMethodId: parseInt(form.paymentMethodId, 10),
        notes: form.notes.trim() || undefined,
      });
      toast.success('Ingreso registrado.');
      setCreateOpen(false);
      setForm({ amount: '', description: '', paymentMethodId: '', notes: '' });
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo registrar (¿caja abierta?)'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminFilterRow>
        <AdminFilterDate id="oi-from" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <AdminFilterDate id="oi-to" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-admin text-xs px-3 py-2">
          Nuevo ingreso
        </button>
        <AdminExportButtons
          onExcel={() =>
            downloadExcelTable({
              fileBase: `otros-ingresos-${pdfFileDateSuffix()}`,
              sheetName: 'OtrosIngresos',
              title: 'Otros ingresos',
              columns,
              rows: exportRows,
            })
          }
          onPdf={() =>
            downloadTablePDF({
              filename: `otros-ingresos-${pdfFileDateSuffix()}.pdf`,
              title: 'Otros ingresos',
              columns,
              rows: exportRows,
            })
          }
        />
      </AdminFilterRow>

      <DataCard title="Total en esta página">
        <p className="text-2xl font-semibold text-gold">{formatMoney(pageTotal)}</p>
        <p className="text-xs text-stone-500 mt-1">{total} registro(s) en el filtro</p>
      </DataCard>

      <DataCard title="Otros ingresos">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">Sin registros en el periodo.</p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Fecha</TableHeader>
                <TableHeader>Descripción</TableHeader>
                <TableHeader>Método</TableHeader>
                <TableHeader align="right">Monto</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.incomeDate}</TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell className="text-xs">{r.paymentMethodName || '—'}</TableCell>
                    <TableCell align="right" className="font-semibold">
                      {formatMoney(r.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination
              idPrefix="oi-report"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="ingresos"
            />
          </>
        )}
      </DataCard>

      <AdminModalShell
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Nuevo otro ingreso"
        subtitle="Requiere caja abierta"
        size="sm"
        preventClose={saving}
        footer={
          <div className="flex gap-2 w-full">
            <button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2.5 bg-stone-100 rounded-xl text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" form="oi-create-form" disabled={saving} className="flex-1 px-4 py-2.5 bg-barber-dark text-white rounded-xl text-sm font-semibold">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        <form id="oi-create-form" onSubmit={handleCreate} className="space-y-3">
          <div>
            <label htmlFor="oi-description" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Descripción *
            </label>
            <input
              id="oi-description"
              name="description"
              autoComplete="off"
              className="input-premium"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 200) }))}
              required
            />
          </div>
          <div>
            <label htmlFor="oi-amount" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Monto *
            </label>
            <input
              id="oi-amount"
              name="amount"
              inputMode="numeric"
              autoComplete="off"
              className="input-premium"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: formatMoneyInputDigits(e.target.value) }))}
              required
            />
          </div>
          <div>
            <label htmlFor="oi-method" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Método *
            </label>
            <select
              id="oi-method"
              name="paymentMethodId"
              className="input-premium"
              value={form.paymentMethodId}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethodId: e.target.value }))}
              required
            >
              <option value="">Selecciona…</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.isCash ? ' (efectivo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="oi-notes" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Notas
            </label>
            <textarea
              id="oi-notes"
              name="notes"
              className="input-premium resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 500) }))}
            />
          </div>
        </form>
      </AdminModalShell>
    </div>
  );
}
