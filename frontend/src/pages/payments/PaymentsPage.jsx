/**
 * Listado de pagos e historial de ventas
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as paymentService from '../../services/paymentService';
import PageHeader from '../../components/admin/PageHeader';
import StatsCard from '../../components/admin/StatsCard';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';

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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este pago?')) return;
    try {
      await paymentService.deletePayment(id);
      fetchPayments();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');
  const formatAmount = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  return (
    <div className="page-shell">
      <PageHeader
        title="Pagos y ventas"
        label="Finanzas"
        subtitle="Historial de transacciones"
        actions={
          <Link to="/payments/new" className="btn-admin">
            + Registrar pago
          </Link>
        }
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-premium py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-premium py-2.5 text-sm"
          />
        </div>
      </div>

      <StatsCard
        label="Total en el periodo"
        value={formatAmount(total.total)}
        sublabel={`${total.count} transacciones`}
        variant="primary"
      />

      {error && (
        <div className="alert-error" role="alert">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">Cargando...</div>
        </DataCard>
      ) : payments.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">No hay pagos en este periodo.</div>
        </DataCard>
      ) : (
        <DataCard>
          <Table>
            <TableHead>
              <TableHeader>Fecha</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Servicio</TableHeader>
              <TableHeader>Método</TableHeader>
              <TableHeader className="text-right">Monto</TableHeader>
              <TableHeader></TableHeader>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {formatDate(p.created_at)}
                    {p.start_time && (
                      <span className="text-stone-500 ml-1">{formatTime(p.start_time)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.client_first_name && p.client_last_name
                      ? `${p.client_first_name} ${p.client_last_name}`
                      : '-'}
                  </TableCell>
                  <TableCell>{p.service_name || '-'}</TableCell>
                  <TableCell>{p.payment_method_name || '-'}</TableCell>
                  <TableCell className="text-right font-semibold text-gold">
                    {formatAmount(p.amount)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}
    </div>
  );
}
