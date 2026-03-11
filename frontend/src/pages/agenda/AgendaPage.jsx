/**
 * Agenda semanal del barbero - Vista por semana
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    dateFrom: monday.toISOString().slice(0, 10),
    dateTo: sunday.toISOString().slice(0, 10),
  };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10);
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { dateFrom, dateTo } = getWeekRange(weekStart);

  useEffect(() => {
    if (!user?.barberId) return;
    setLoading(true);
    setError('');
    appointmentService
      .getAppointments({ dateFrom, dateTo, barberId: user.barberId })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setAppointments(list);
      })
      .catch((err) => {
        setError(err?.message || 'Error al cargar agenda');
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, user?.barberId]);

  const goPrevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const goNextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');
  const appointmentsByDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    appointmentsByDay[key] = appointments.filter((a) => a.appointment_date === key);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi agenda"
        subtitle="Vista semanal de tus citas"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevWeek}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Semana anterior
            </button>
            <span className="text-sm text-gray-600 min-w-[180px] text-center">
              {new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(dateTo + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={goNextWeek}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Siguiente semana →
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">Cargando agenda...</div>
        </DataCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {Object.entries(appointmentsByDay).map(([dayStr, list]) => {
            const d = new Date(dayStr + 'T12:00:00');
            const dayName = DAY_NAMES[d.getDay()];
            const isToday = dayStr === new Date().toISOString().slice(0, 10);
            return (
              <DataCard
                key={dayStr}
                title={
                  <span className={isToday ? 'font-semibold text-primary-600' : ''}>
                    {dayName} {d.getDate()}
                  </span>
                }
              >
                {list.length === 0 ? (
                  <p className="text-gray-500 text-sm">Sin citas</p>
                ) : (
                  <ul className="space-y-2">
                    {list
                      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
                      .map((a) => (
                        <li key={a.id} className="text-sm border-l-2 border-gray-200 pl-2 py-0.5">
                          <span className="font-medium text-gray-900">{formatTime(a.start_time)}</span>
                          <span className="text-gray-600">
                            {' '}
                            {a.client_first_name} {a.client_last_name}
                          </span>
                          <span className="block text-gray-500 truncate">{a.service_name}</span>
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs ${
                              a.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ['cancelled', 'no_show'].includes(a.status)
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-primary-100 text-primary-800'
                            }`}
                          >
                            {STATUS_LABELS[a.status] || a.status}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </DataCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
