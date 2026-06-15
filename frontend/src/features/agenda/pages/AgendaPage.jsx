/**
 * Agenda semanal del barbero — solo lectura: calendario, lista y detalle de citas.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import PageHeader from '@/shared/components/admin/PageHeader';
import StatsCard from '@/shared/components/admin/StatsCard';
import DataCard from '@/shared/components/admin/DataCard';
import AgendaWeekToolbar from '@/features/agenda/components/AgendaWeekToolbar';
import AgendaListView from '@/features/agenda/components/AgendaListView';
import AgendaDetailModal from '@/features/agenda/components/AgendaDetailModal';
import WeeklyAgendaGrid from '@/features/agenda/components/WeeklyAgendaGrid';
import * as agendaService from '@/features/agenda/services/agendaService';
import {
  getWeekRange,
  groupAppointmentsByDay,
  mondayOfWeek,
  shiftWeek,
  summarizeWeek,
} from '@/features/agenda/utils/agendaHelpers';
import { getLocalDateToday } from '@/shared/utils/appointmentTime';

export default function AgendaPage() {
  const { user } = useAuth();
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'week';
    return window.matchMedia?.('(max-width: 768px)')?.matches ? 'list' : 'week';
  });
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(getLocalDateToday()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const barberId = user?.barberId;
  const { dateFrom, dateTo } = getWeekRange(weekStart);

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

  const fetchAppointments = useCallback(async () => {
    if (!barberId) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await agendaService.getWeekAppointments({
        dateFrom,
        dateTo,
        barberId,
      });
      setAppointments(data.appointments ?? []);
    } catch (err) {
      setError(err?.message || 'Error al cargar agenda');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [barberId, dateFrom, dateTo]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const appointmentsByDay = useMemo(
    () => groupAppointmentsByDay(appointments, weekStart),
    [appointments, weekStart]
  );

  const summary = useMemo(() => summarizeWeek(appointments), [appointments]);

  const openDetail = async (row) => {
    setDetailAppointment(row);
    setDetailLoading(true);
    try {
      const full = await agendaService.getAppointmentDetail(row.id);
      setDetailAppointment(full || row);
    } catch {
      setDetailAppointment(row);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!barberId) {
    return (
      <div className="page-shell">
        <PageHeader title="Mi agenda" subtitle="Vista semanal de tus citas" />
        <DataCard>
          <div className="py-12 text-center text-stone-500 text-sm">
            Tu usuario no está vinculado a un perfil de barbero. Contacta al administrador.
          </div>
        </DataCard>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Mi agenda"
        subtitle="Consulta tus citas por semana en calendario o lista"
      />

      <AgendaWeekToolbar
        dateFrom={dateFrom}
        dateTo={dateTo}
        view={view}
        onViewChange={setView}
        onPrevWeek={() => setWeekStart((w) => shiftWeek(w, -7))}
        onNextWeek={() => setWeekStart((w) => shiftWeek(w, 7))}
        onToday={() => setWeekStart(mondayOfWeek(getLocalDateToday()))}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label="Total semana" value={summary.total} />
        <StatsCard label="Pendientes" value={summary.pending} />
        <StatsCard label="Completadas" value={summary.completed} />
        <StatsCard label="Canceladas / no show" value={summary.cancelled} />
      </div>

      {error && (
        <div className="alert-error text-sm py-2.5" role="alert">
          {error}
        </div>
      )}

      <DataCard>
        {!loading && appointments.length === 0 && !error ? (
          <div className="py-10 text-center text-stone-500 text-sm mb-4">
            No tienes citas programadas en esta semana.
          </div>
        ) : null}

        {view === 'week' ? (
          <WeeklyAgendaGrid
            dateFrom={dateFrom}
            appointments={appointments}
            loading={loading}
            readOnly
            onViewAppointment={openDetail}
          />
        ) : loading ? (
          <div className="py-16 text-center text-stone-500">
            <div className="inline-block h-6 w-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Cargando agenda…</p>
          </div>
        ) : (
          <AgendaListView appointmentsByDay={appointmentsByDay} onSelectAppointment={openDetail} />
        )}
      </DataCard>

      <AgendaDetailModal
        appointment={detailAppointment}
        loading={detailLoading}
        onClose={() => {
          setDetailAppointment(null);
          setDetailLoading(false);
        }}
      />
    </div>
  );
}
