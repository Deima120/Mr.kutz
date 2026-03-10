/**
 * Listado y calendario de citas
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as appointmentService from '../../services/appointmentService';
import * as barberService from '../../services/barberService';
import { useAuth } from '../../context/AuthContext';

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

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { date: filterDate };
      if (filterBarber) params.barberId = filterBarber;
      const data = await appointmentService.getAppointments(params);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    barberService.getBarbers().then((b) => {
      setBarbers(Array.isArray(b) ? b : []);
    });
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterBarber]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Citas</h2>
        <Link
          to="/appointments/new"
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          + Nueva cita
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Barbero</label>
          <select
            value={filterBarber}
            onChange={(e) => setFilterBarber(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Todos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.first_name} {b.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500">Cargando...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow border p-12 text-center text-gray-500">
          No hay citas para esta fecha.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Barbero</th>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatTime(a.start_time)}</td>
                    <td className="px-4 py-3">
                      {a.client_first_name} {a.client_last_name}
                    </td>
                    <td className="px-4 py-3">
                      {a.barber_first_name} {a.barber_last_name}
                    </td>
                    <td className="px-4 py-3">{a.service_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          a.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : a.status === 'cancelled' || a.status === 'no_show'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}
                      >
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                        <select
                          value={a.status}
                          onChange={(e) =>
                            handleStatusChange(a.id, e.target.value)
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="scheduled">Agendada</option>
                          <option value="confirmed">Confirmada</option>
                          <option value="in_progress">En progreso</option>
                          <option value="completed">Completada</option>
                          <option value="cancelled">Cancelada</option>
                          <option value="no_show">No asistió</option>
                        </select>
                      )}
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
