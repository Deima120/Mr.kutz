/**
 * Agenda del barbero.
 *
 * Dos vistas:
 *   - 'week': calendario tipo Google (drag & drop para mover citas).
 *   - 'list': resumen por días (la vista que ya existía).
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import { appointmentNotesOf } from '@/shared/utils/appointmentTime';
import { AppointmentNoteEllipsis } from '@/shared/components/AppointmentNoteText';
import WeeklyAgendaGrid from '@/features/agenda/components/WeeklyAgendaGrid';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toISO(monday);
}

function getWeekRange(dateStr) {
  const start = new Date(`${dateStr}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    dateFrom: toISO(start),
    dateTo: toISO(end),
  };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'week';
    return window.matchMedia?.('(max-width: 768px)')?.matches ? 'list' : 'week';
  });
  const [weekStart, setWeekStart] = useState(() => mondayOf(toISO(new Date())));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => {
      setView((current) => {
        if (e.matches && current === 'week') return 'list';
        return current;
      });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moveFeedback, setMoveFeedback] = useState(null);

  const { dateFrom, dateTo } = getWeekRange(weekStart);

  const fetchAppointments = useCallback(async () => {
    if (!user?.barberId) return;
    setLoading(true);
    setError('');
    try {
      const data = await appointmentService.getAppointments({
        dateFrom,
        dateTo,
        barberId: user.barberId,
      });
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setAppointments(list);
    } catch (err) {
      setError(err?.message || 'Error al cargar agenda');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, user?.barberId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const goPrevWeek = () => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() - 7);
    setWeekStart(toISO(d));
  };

  const goNextWeek = () => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + 7);
    setWeekStart(toISO(d));
  };

  const goToday = () => {
    setWeekStart(mondayOf(toISO(new Date())));
  };

  const formatTime = (t) => {
    if (!t) return '';
    if (t instanceof Date) {
      return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
    }
    const s = String(t);
    const iso = s.match(/T(\d{1,2}):(\d{2})/);
    if (iso) return `${pad(iso[1])}:${iso[2]}`;
    const any = s.match(/(\d{1,2}):(\d{2})/);
    if (any) return `${pad(any[1])}:${any[2]}`;
    return s.slice(0, 5);
  };

  const handleSelectAppointment = (id) => {
    navigate(`/appointments/${id}/edit`);
  };

  const handleSelectSlot = ({ date, time }) => {
    navigate(
      `/appointments/new?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
    );
  };

  const handleMoveAppointment = async ({ id, date, time }) => {
    const original = appointments.find((a) => a.id === id);
    if (!original) return;
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, appointment_date: date, start_time: time } : a
      )
    );
    setMoveFeedback({ type: 'info', text: 'Moviendo cita…' });
    try {
      await appointmentService.updateAppointment(id, {
        appointmentDate: date,
        startTime: time,
      });
      setMoveFeedback({ type: 'success', text: 'Cita actualizada.' });
      fetchAppointments();
    } catch (err) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? original : a))
      );
      setMoveFeedback({
        type: 'error',
        text: err?.message || 'No se pudo mover la cita.',
      });
    } finally {
      setTimeout(() => setMoveFeedback(null), 2500);
    }
  };

  // --- Preparación para la vista de lista ---
  const appointmentsByDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + i);
    const key = toISO(d);
    appointmentsByDay[key] = appointments.filter(
      (a) => String(a.appointment_date || '').slice(0, 10) === key
    );
  }

  return (
    <div className="space-y-6">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Anterior
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-2 rounded-xl border border-stone-300 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Hoy
            </button>
            <span className="text-sm text-stone-600 min-w-[200px] text-center font-medium">
              {new Date(`${dateFrom}T12:00:00`).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              })}
              {' – '}
              {new Date(`${dateTo}T12:00:00`).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={goNextWeek}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                view === 'week'
                  ? 'bg-barber-dark text-white'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                view === 'list'
                  ? 'bg-barber-dark text-white'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {moveFeedback && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            moveFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : moveFeedback.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-stone-50 border-stone-200 text-stone-700'
          }`}
          role="status"
        >
          {moveFeedback.text}
        </div>
      )}

      {view === 'week' ? (
        <WeeklyAgendaGrid
          dateFrom={dateFrom}
          appointments={appointments}
          loading={loading}
          onSelectAppointment={handleSelectAppointment}
          onSelectSlot={handleSelectSlot}
          onMoveAppointment={handleMoveAppointment}
        />
      ) : loading ? (
        <div className="py-16 text-center text-stone-500">Cargando agenda...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {Object.entries(appointmentsByDay).map(([dayStr, list]) => {
            const d = new Date(`${dayStr}T12:00:00`);
            const dayName = DAY_NAMES[d.getDay()];
            const isToday = dayStr === toISO(new Date());
            return (
              <div
                key={dayStr}
                className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
                  isToday ? 'border-gold/50 ring-1 ring-gold/20' : 'border-stone-200'
                }`}
              >
                <div className="px-4 py-3 border-b border-stone-100">
                  <h3
                    className={`font-serif font-medium ${
                      isToday ? 'text-gold' : 'text-stone-900'
                    }`}
                  >
                    {dayName} {d.getDate()}
                  </h3>
                </div>
                <div className="p-4 min-h-[120px]">
                  {list.length === 0 ? (
                    <p className="text-stone-400 text-sm">Sin citas</p>
                  ) : (
                    <ul className="space-y-2">
                      {list
                        .slice()
                        .sort((a, b) =>
                          String(a.start_time).localeCompare(String(b.start_time))
                        )
                        .map((a) => {
                          const noteText = appointmentNotesOf(a);
                          return (
                            <li
                              key={a.id}
                              className="text-sm border-l-2 border-gold/40 pl-2 py-1"
                            >
                              <span className="font-semibold text-stone-900">
                                {formatTime(a.start_time)}
                              </span>
                              <span className="text-stone-600">
                                {' '}
                                {a.client_first_name} {a.client_last_name}
                              </span>
                              <span className="block text-stone-500 truncate">
                                {a.service_name}
                              </span>
                              {noteText ? (
                                <span className="block text-stone-500 text-xs mt-0.5">
                                  <span className="text-stone-600 font-medium">
                                    Nota:{' '}
                                  </span>
                                  <AppointmentNoteEllipsis
                                    text={noteText}
                                    maxLength={48}
                                  />
                                </span>
                              ) : null}
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
                          );
                        })}
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
