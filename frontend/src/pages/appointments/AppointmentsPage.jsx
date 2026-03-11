/**
 * Listado y calendario de citas
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as appointmentService from '../../services/appointmentService';
import * as barberService from '../../services/barberService';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';

const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [filterBarber, setFilterBarber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  const isClient = user?.role === 'client';

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { date: filterDate };
      if (isAdmin && filterBarber) params.barberId = filterBarber;
      if (isBarber && user?.barberId) params.barberId = user.barberId;
      if (isClient) {
        delete params.date;
        params.clientId = user?.clientId;
      }
      const data = await appointmentService.getAppointments(params);
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setAppointments(list);
    } catch (err) {
      setError(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      barberService.getBarbers().then((b) => {
        setBarbers(Array.isArray(b) ? b : b?.data ?? []);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isBarber && !user?.barberId) return;
    if (isClient && !user?.clientId) return;
    fetchAppointments();
  }, [filterDate, filterBarber, user?.barberId, user?.clientId]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentService.updateAppointment(id, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
    }
  };

  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const pageTitle = isClient ? 'Mis citas' : isBarber ? 'Mis citas' : 'Citas';
  const pageSubtitle = isClient
    ? 'Tus citas y reservas'
    : isBarber
    ? 'Tus citas por fecha'
    : 'Gestión de citas por fecha';

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          !isClient ? (
            <Link
              to="/appointments/new"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm"
            >
              + Nueva cita
            </Link>
          ) : (
            <Link
              to="/appointments/new"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm"
            >
              + Agendar cita
            </Link>
          )
        }
      />

      <div className="flex flex-wrap gap-4 items-end">
        {!isClient && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Barbero</label>
            <select
              value={filterBarber}
              onChange={(e) => setFilterBarber(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 min-w-[180px]"
            >
              <option value="">Todos</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">Cargando...</div>
        </DataCard>
      ) : appointments.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">No hay citas para esta fecha.</div>
        </DataCard>
      ) : (
        <DataCard>
          <Table>
            <TableHead>
              <TableHeader>Hora</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Barbero</TableHeader>
              <TableHeader>Servicio</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{formatTime(a.start_time)}</TableCell>
                  <TableCell>
                    {a.client_first_name} {a.client_last_name}
                  </TableCell>
                  <TableCell>
                    {a.barber_first_name} {a.barber_last_name}
                  </TableCell>
                  <TableCell>{a.service_name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                        a.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.status === 'cancelled' || a.status === 'no_show'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-primary-100 text-primary-800'
                      }`}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="scheduled">Agendada</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="no_show">No asistió</option>
                      </select>
                    )}
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
