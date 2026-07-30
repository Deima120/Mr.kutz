/**
 * Historial de gastos — listado + alta rápida (sin upload de adjunto).
 */

import { useCallback, useEffect, useState } from 'react';
import * as expenseService from '@/features/expenses/services/expenseService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import {
  AdminPagination,
  AdminFilterDate,
  AdminFilterRow,
  FilterSelect,
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

export default function ExpensesReport() {
  const toast = useAppToast();
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('active');
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: '', amount: '', expenseDate: getLocalDateToday(), notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    expenseService
      .getCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      return;
    }
    setLoading(true);
    try {
      const result = await expenseService.getExpenses({
        dateFrom,
        dateTo,
        categoryId: categoryId || undefined,
        status: status || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setRows(result.expenses || []);
      setTotal(result.total || 0);
      setTotals(result.totals || null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar gastos'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, categoryId, status, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, categoryId, status, pageSize]);

  const categoryOptions = [
    { id: '', label: 'Todas' },
    ...categories.map((c) => ({ id: String(c.id), label: c.name })),
  ];

  const exportRows = rows.map((e) => ({
    id: e.id,
    fecha: e.expenseDate,
    categoria: e.categoryName || e.category?.name || '',
    monto: formatMoney(e.amount),
    folio: e.reference || '',
    estado: e.voidedAt ? 'Anulado' : 'Vigente',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'categoria', header: 'Categoría' },
    { key: 'monto', header: 'Monto' },
    { key: 'folio', header: 'Folio' },
    { key: 'estado', header: 'Estado' },
  ];

  const handleCreate = async (ev) => {
    ev.preventDefault();
    const amount = parseMoneyInput(form.amount);
    if (!form.categoryId || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Indica categoría y monto válido.');
      return;
    }
    setSaving(true);
    try {
      await expenseService.createExpense({
        categoryId: parseInt(form.categoryId, 10),
        amount,
        expenseDate: form.expenseDate,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Gasto registrado.');
      setCreateOpen(false);
      setForm({ categoryId: '', amount: '', expenseDate: getLocalDateToday(), notes: '' });
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo registrar el gasto'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminFilterRow>
        <AdminFilterDate id="exp-from" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <AdminFilterDate id="exp-to" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <FilterSelect label="Categoría" options={categoryOptions} value={categoryId} onChange={setCategoryId} />
        <FilterSelect
          label="Estado"
          options={[
            { id: '', label: 'Todos' },
            { id: 'active', label: 'Vigentes' },
            { id: 'voided', label: 'Anulados' },
          ]}
          value={status}
          onChange={setStatus}
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn-admin text-xs px-3 py-2"
        >
          Nuevo gasto
        </button>
        <AdminExportButtons
          onExcel={() =>
            downloadExcelTable({
              fileBase: `gastos-${pdfFileDateSuffix()}`,
              sheetName: 'Gastos',
              title: 'Historial de gastos',
              columns,
              rows: exportRows,
            })
          }
          onPdf={() =>
            downloadTablePDF({
              filename: `gastos-${pdfFileDateSuffix()}.pdf`,
              title: 'Historial de gastos',
              columns,
              rows: exportRows,
            })
          }
        />
      </AdminFilterRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <DataCard title="Total gastos (filtro)">
          <p className="text-2xl font-semibold text-gold">{formatMoney(totals?.totalAmount ?? 0)}</p>
          <p className="text-xs text-stone-500 mt-1">{totals?.count ?? 0} registro(s)</p>
        </DataCard>
        <DataCard title="Por categoría">
          {(totals?.byCategory || []).length ? (
            <ul className="text-sm space-y-1 max-h-28 overflow-y-auto">
              {totals.byCategory.map((c) => (
                <li key={c.categoryId} className="flex justify-between gap-2">
                  <span className="truncate">{c.categoryName}</span>
                  <span className="font-semibold shrink-0">{formatMoney(c.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Sin desglose</p>
          )}
        </DataCard>
      </div>

      <DataCard title="Gastos">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">Sin gastos en el periodo.</p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Fecha</TableHeader>
                <TableHeader>Categoría</TableHeader>
                <TableHeader align="right">Monto</TableHeader>
                <TableHeader>Folio</TableHeader>
                <TableHeader>Estado</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} className={e.voidedAt ? 'opacity-60' : ''}>
                    <TableCell className="text-sm">{e.expenseDate}</TableCell>
                    <TableCell className="text-sm">{e.categoryName || e.category?.name}</TableCell>
                    <TableCell align="right" className="font-semibold">
                      {formatMoney(e.amount)}
                    </TableCell>
                    <TableCell className="text-xs">{e.reference || '—'}</TableCell>
                    <TableCell className="text-xs">{e.voidedAt ? 'Anulado' : 'Vigente'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination
              idPrefix="exp-report"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="gastos"
            />
          </>
        )}
      </DataCard>

      <AdminModalShell
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Nuevo gasto"
        size="sm"
        preventClose={saving}
        footer={
          <div className="flex gap-2 w-full">
            <button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="flex-1 px-4 py-2.5 bg-stone-100 rounded-xl text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" form="expense-create-form" disabled={saving} className="flex-1 px-4 py-2.5 bg-barber-dark text-white rounded-xl text-sm font-semibold">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        <form id="expense-create-form" onSubmit={handleCreate} className="space-y-3">
          <div>
            <label htmlFor="exp-category" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Categoría *
            </label>
            <select
              id="exp-category"
              name="categoryId"
              className="input-premium"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
            >
              <option value="">Selecciona…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="exp-amount" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Monto *
            </label>
            <input
              id="exp-amount"
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
            <label htmlFor="exp-date" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Fecha *
            </label>
            <input
              id="exp-date"
              name="expenseDate"
              type="date"
              className="input-premium"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="exp-notes" className="block text-[11px] font-semibold text-stone-600 mb-1">
              Notas
            </label>
            <textarea
              id="exp-notes"
              name="notes"
              className="input-premium resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 500) }))}
            />
          </div>
          <p className="text-[11px] text-stone-500">El adjunto de comprobante se agregará en una etapa posterior.</p>
        </form>
      </AdminModalShell>
    </div>
  );
}
