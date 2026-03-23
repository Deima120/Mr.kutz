/**
 * Historial de servicios realizados por el barbero (citas completadas)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';

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
    d ? new Date((d + '').slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  return (
    <div className="page-shell">
      <div>
        <p className="section-label text-gold">Historial</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-4">
          Servicios completados
        </h1>
        <p className="text-stone-500 mb-4">Citas que has marcado como completadas en el periodo.</p>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
          </div>
          <span className="text-stone-400 pt-6">—</span>
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
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="panel-card overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center text-stone-500">Cargando historial...</div>
          ) : appointments.length === 0 ? (
            <p className="text-stone-500 py-8 text-center">No hay servicios completados en este periodo.</p>
          ) : (
            <>
              <p className="text-sm text-stone-600 mb-6">
                {appointments.length} servicio{appointments.length !== 1 ? 's' : ''} completado
                {appointments.length !== 1 ? 's' : ''} en el periodo.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-500 font-semibold uppercase tracking-wider text-xs">
                      <th className="pb-3 pr-4">Fecha</th>
                      <th className="pb-3 pr-4">Hora</th>
                      <th className="pb-3 pr-4">Cliente</th>
                      <th className="pb-3 pr-4">Servicio</th>
                      <th className="pb-3 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                        <td className="py-3 pr-4 text-stone-700">{formatDate(a.appointment_date)}</td>
                        <td className="py-3 pr-4 font-medium text-stone-900">{formatTime(a.start_time)}</td>
                        <td className="py-3 pr-4">{a.client_first_name} {a.client_last_name}</td>
                        <td className="py-3 pr-4">{a.service_name}</td>
                        <td className="py-3 text-right font-medium text-stone-900">${parseFloat(a.price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
