/**
 * Listado de pagos e historial de ventas
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as paymentService from '@/features/payments/services/paymentService';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import { downloadCSV, printAsPDF } from '@/shared/utils/export';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState({ total: 0, count: 0 });
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { dateFrom, dateTo };
      const [paymentsData, totalData] = await Promise.all([
        paymentService.getPayments(params),
        paymentService.getPaymentsTotal(params),
      ]);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setTotal(totalData || { total: 0, count: 0 });
    } catch (err) {
      setError(err?.message || 'Error al cargar pagos');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [dateFrom, dateTo]);

  const formatAmount = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  const handleVoid = async (p) => {
    if (
      !window.confirm(
        `¿Anular este pago de ${formatAmount(p.amount)}? El registro se conservará como anulado y no sumará en totales. Si era venta de producto, el stock volverá al inventario.`
      )
    ) {
      return;
    }
    const voidReason = window.prompt('Motivo de anulación (opcional):', '') ?? '';
    try {
      await paymentService.voidPayment(p.id, {
        voidReason: voidReason.trim() || undefined,
      });
      await fetchPayments();
    } catch (err) {
      setError(err?.message || 'Error al anular el pago');
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const formatTime = (t) => {
    if (!t) return '';
    if (t instanceof Date) {
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const s = String(t);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()) && s.includes('T')) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const iso = s.match(/T(\d{1,2}):(\d{2})/);
    if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
    const any = s.match(/(\d{1,2}):(\d{2})/);
    if (any) {
      const hh = String(any[1]).padStart(2, '0');
      return `${hh}:${any[2]}`;
    }
    return s.slice(0, 5);
  };

  const btnToolbar = 'btn-admin-outline text-xs py-2 px-3';

  return (
    <div className="page-shell">
      <PageHeader
        compact
        title="Pagos y ventas"
        label="Finanzas"
        subtitle="Historial de transacciones"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  'pagos.csv',
                  payments.map((p) => ({
                    id: p.id,
                    fecha: p.created_at,
                    estado: p.voided_at ? 'Anulado' : 'Vigente',
                    motivo_anulacion: p.void_reason || '',
                    cliente: `${p.client_first_name || ''} ${p.client_last_name || ''}`.trim(),
                    concepto: p.product_name
                      ? `Venta: ${p.product_name}`
                      : p.service_name || '',
                    producto: p.product_name || '',
                    sku: p.product_sku || '',
                    cantidad_producto: p.product_quantity ?? '',
                    metodo: p.payment_method_name || '',
                    monto: p.amount,
                  }))
                )
              }
              className={btnToolbar}
            >
              CSV
            </button>
            <button type="button" onClick={printAsPDF} className={btnToolbar}>
              PDF
            </button>
            <Link to="/payments/new" className="btn-admin text-xs py-2 px-3">
              Registrar pago
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-stone-200/90 bg-stone-50/60 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold text-stone-500">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-premium py-2 text-xs"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold text-stone-500">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-premium py-2 text-xs"
            />
          </div>
        </div>
        <div className="flex items-baseline gap-2 border-t border-stone-200/80 pt-3 sm:border-t-0 sm:pt-0">
          <span className="text-[10px] font-semibold text-stone-500">Total periodo</span>
          <span className="font-serif text-lg font-medium text-gold tabular-nums">{formatAmount(total.total)}</span>
          <span className="text-[11px] text-stone-500">
            · {total.count} vigente{total.count === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-3 text-sm py-2" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <DataCard compact>
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        </DataCard>
      ) : payments.length === 0 ? (
        <DataCard compact>
          <div className="py-10 text-center text-sm text-stone-500">No hay pagos en este periodo.</div>
        </DataCard>
      ) : (
        <DataCard compact>
          <Table>
            <TableHead>
              <TableHeader compact>Fecha</TableHeader>
              <TableHeader compact>Estado</TableHeader>
              <TableHeader compact>Cliente</TableHeader>
              <TableHeader compact>Concepto</TableHeader>
              <TableHeader compact>Método</TableHeader>
              <TableHeader compact className="text-right">
                Monto
              </TableHeader>
              <TableHeader compact className="w-16" />
            </TableHead>
            <TableBody>
              {payments.map((p) => {
                const isVoided = Boolean(p.voided_at);
                return (
                  <TableRow key={p.id} className={isVoided ? 'opacity-70 bg-stone-50/90' : ''}>
                    <TableCell compact className="text-xs">
                      <span className="whitespace-nowrap">{formatDate(p.created_at)}</span>
                      {p.start_time ? (
                        <span className="text-stone-500 ml-1">{formatTime(p.start_time)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell compact className="text-xs">
                      {isVoided ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex w-fit rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                            Anulado
                          </span>
                          {p.void_reason ? (
                            <span className="max-w-[10rem] text-[10px] leading-snug text-stone-500">
                              {p.void_reason}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          Vigente
                        </span>
                      )}
                    </TableCell>
                    <TableCell compact className="text-xs max-w-[9rem] truncate">
                      {p.client_first_name && p.client_last_name
                        ? `${p.client_first_name} ${p.client_last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell compact className="text-xs max-w-[14rem]">
                      {p.product_name ? (
                        <span className="line-clamp-2">
                          Venta: {p.product_name}
                          {p.product_sku ? ` · ${p.product_sku}` : ''}
                          {p.product_quantity != null ? ` × ${p.product_quantity}` : ''}
                        </span>
                      ) : (
                        <span className="line-clamp-2">{p.service_name || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell compact className="text-xs">
                      {p.payment_method_name || '—'}
                    </TableCell>
                    <TableCell
                      compact
                      className={`text-right text-xs font-semibold tabular-nums ${
                        isVoided ? 'text-stone-500 line-through' : 'text-gold'
                      }`}
                    >
                      {formatAmount(p.amount)}
                    </TableCell>
                    <TableCell compact className="text-right">
                      {!isVoided ? (
                        <button
                          type="button"
                          onClick={() => handleVoid(p)}
                          className="text-[11px] font-medium text-amber-800 hover:text-amber-900"
                        >
                          Anular
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataCard>
      )}
    </div>
  );
}
