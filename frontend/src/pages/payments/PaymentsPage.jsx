/**
 * Listado de pagos e historial de ventas
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as paymentService from '../../services/paymentService';
import * as appointmentService from '../../services/appointmentService';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Pagos y ventas</h2>
        <Link
          to="/payments/new"
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          + Registrar pago
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-primary-600 text-white rounded-xl p-6">
          <p className="text-primary-100 text-sm">Total en el periodo</p>
          <p className="text-2xl font-bold mt-1">{formatAmount(total.total)}</p>
          <p className="text-primary-200 text-sm mt-1">{total.count} transacciones</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500">Cargando...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow border p-12 text-center text-gray-500">
          No hay pagos en este periodo.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {formatDate(p.created_at)}
                      {p.start_time && (
                        <span className="text-gray-500 ml-1">
                          {formatTime(p.start_time)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.client_first_name && p.client_last_name
                        ? `${p.client_first_name} ${p.client_last_name}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.service_name || '-'}</td>
                    <td className="px-4 py-3">{p.payment_method_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatAmount(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
