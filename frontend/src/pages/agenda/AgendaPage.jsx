/**
 * Agenda semanal del barbero - Vista por semana
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';

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
    appointmentsByDay[key] = appointments.filter((a) => (a.appointment_date || '').toString().slice(0, 10) === key);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label text-gold">Vista semanal</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-4">
          Mi agenda
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevWeek}
              className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-stone-600 min-w-[200px] text-center font-medium">
              {new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(dateTo + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={goNextWeek}
              className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-stone-500">Cargando agenda...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {Object.entries(appointmentsByDay).map(([dayStr, list]) => {
            const d = new Date(dayStr + 'T12:00:00');
            const dayName = DAY_NAMES[d.getDay()];
            const isToday = dayStr === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={dayStr}
                className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
                  isToday ? 'border-gold/50 ring-1 ring-gold/20' : 'border-stone-200'
                }`}
              >
                <div className="px-4 py-3 border-b border-stone-100">
                  <h3 className={`font-serif font-medium ${isToday ? 'text-gold' : 'text-stone-900'}`}>
                    {dayName} {d.getDate()}
                  </h3>
                </div>
                <div className="p-4 min-h-[120px]">
                  {list.length === 0 ? (
                    <p className="text-stone-400 text-sm">Sin citas</p>
                  ) : (
                    <ul className="space-y-2">
                      {list
                        .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
                        .map((a) => (
                          <li key={a.id} className="text-sm border-l-2 border-gold/40 pl-2 py-1">
                            <span className="font-semibold text-stone-900">{formatTime(a.start_time)}</span>
                            <span className="text-stone-600"> {a.client_first_name} {a.client_last_name}</span>
                            <span className="block text-stone-500 truncate">{a.service_name}</span>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-lg text-xs font-medium ${
                                a.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : ['cancelled', 'no_show'].includes(a.status)
                                  ? 'bg-stone-100 text-stone-600'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {STATUS_LABELS[a.status] || a.status}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
