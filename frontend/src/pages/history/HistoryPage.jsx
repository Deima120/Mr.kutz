/**
 * Historial de servicios realizados por el barbero (citas completadas)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';

export default function HistoryPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!user?.barberId) return;
    setLoading(true);
    setError('');
    appointmentService
      .getAppointments({
        dateFrom,
        dateTo,
        barberId: user.barberId,
        status: 'completed',
        limit: 200,
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setAppointments(list);
      })
      .catch((err) => {
        setError(err?.message || 'Error al cargar historial');
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, user?.barberId]);

  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');
  const formatDate = (d) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de servicios"
        subtitle="Citas que has completado"
        actions={
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      <DataCard>
        {loading ? (
          <div className="py-16 text-center text-gray-500">Cargando historial...</div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No hay servicios completados en este periodo.</div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {appointments.length} servicio{appointments.length !== 1 ? 's' : ''} completado
              {appointments.length !== 1 ? 's' : ''} en el periodo seleccionado.
            </p>
            <Table>
              <TableHead>
                <TableHeader>Fecha</TableHeader>
                <TableHeader>Hora</TableHeader>
                <TableHeader>Cliente</TableHeader>
                <TableHeader>Servicio</TableHeader>
                <TableHeader>Precio</TableHeader>
              </TableHead>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-gray-700">{formatDate(a.appointment_date)}</TableCell>
                    <TableCell className="font-medium">{formatTime(a.start_time)}</TableCell>
                    <TableCell>
                      {a.client_first_name} {a.client_last_name}
                    </TableCell>
                    <TableCell>{a.service_name}</TableCell>
                    <TableCell>${parseFloat(a.price || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DataCard>
    </div>
  );
}
