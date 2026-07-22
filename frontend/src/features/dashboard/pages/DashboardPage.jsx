/**
 * Dashboard: Admin (estadísticas) o Barbero (Mi día - citas del día)
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as dashboardService from '@/features/dashboard/services/dashboardService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import { appointmentNotesOf } from '@/shared/utils/appointmentTime';
import { AppointmentNoteBlock } from '@/shared/components/AppointmentNoteText';
import DashboardCard, { DashboardChartPanel } from '@/shared/components/admin/DashboardCard';
import AppointmentRatingsPanel from '@/shared/components/admin/AppointmentRatingsPanel';
import { AdminFilterRow, FilterSelect } from '@/shared/components/admin/AdminListControls';
import {
  DualBarKpiChart,
  HorizontalBarsChart,
  TodayAppointmentsRing,
} from '@/features/dashboard/components/AdminDashboardCharts';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';
import { formatMoney } from '@/shared/utils/money';

const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

function BarberDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingError, setRatingError] = useState('');
  const [ratingPeriod, setRatingPeriod] = useState('30');
  const today = getLocalDateToday();

  const refreshAll = async () => {
    if (!user?.barberId) return;
    setLoading(true);
    setError('');
    try {
      const data = await appointmentService.getAppointments({
        date: today,
        barberId: user?.barberId,
      });
      setAppointments((data.appointments ?? []).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    } catch (err) {
      setError(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.barberId) refreshAll();
  }, [user?.barberId, today]);

  const fetchRatingSummary = async () => {
    setRatingLoading(true);
    setRatingError('');
    try {
      const params = {};
      if (ratingPeriod && ratingPeriod !== 'all') {
        const d = parseInt(ratingPeriod, 10);
        if (Number.isFinite(d) && d > 0) params.days = d;
      } else {
        params.days = 'all';
      }
      const data = await appointmentService.getAppointmentRatingSummary(params);
      setRatingSummary(data && typeof data === 'object' ? data : null);
    } catch (err) {
      setRatingError(err?.message || 'Error al cargar valoraciones');
      setRatingSummary(null);
    } finally {
      setRatingLoading(false);
    }
  };

  useEffect(() => {
    if (user?.barberId) fetchRatingSummary();
  }, [user?.barberId, ratingPeriod]);

  const activeAppointments = appointments.filter(
    (a) => !['cancelled', 'no_show', 'completed'].includes(a.status)
  );
  const nextAppointment = activeAppointments[0];
  const formatTime = (t) => {
    if (!t) return '';
    if (t instanceof Date) {
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const s = String(t);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()) && s.includes('T')) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const iso = s.match(/T(\d{1,2}):(\d{2})/);
    if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
    const any = s.match(/(\d{1,2}):(\d{2})/);
    if (any) {
      const hh = String(any[1]).padStart(2, '0');
      return `${hh}:${any[2]}`;
    }
    return s.slice(0, 5);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label text-gold">Panel del barbero</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
          Mi día
        </h1>
        <p className="text-stone-500">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="mt-4">
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal transition-colors text-sm"
          >
            <span>Ver todas mis citas</span>
            <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <h2 className="font-serif text-lg text-stone-900 font-medium">Tus valoraciones</h2>
          <div className="w-full sm:w-auto sm:min-w-[10rem]">
            <FilterSelect
              id="barber-rating-period"
              label="Periodo"
              value={ratingPeriod}
              onChange={setRatingPeriod}
              ariaLabel="Periodo de valoraciones"
              className="w-full sm:w-auto sm:min-w-[9rem]"
              options={[
                { id: '30', label: 'Últimos 30 días' },
                { id: 'all', label: 'Todos' },
              ]}
            />
          </div>
        </div>
        <div className="p-6">
          <AppointmentRatingsPanel
            summary={ratingSummary}
            loading={ratingLoading}
            error={ratingError}
            compact
            recentLimit={6}
            emptyHint="Cuando los clientes valoren citas completadas, verás aquí el promedio, la distribución y los comentarios."
          />
        </div>
      </div>

      {nextAppointment && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
          <div className="h-1 w-full bg-gold/80" aria-hidden />
          <div className="p-6">
            <h2 className="text-sm font-semibold text-gold tracking-wider mb-3">Siguiente cita</h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-serif text-xl text-stone-900 font-medium">
                  {formatTime(nextAppointment.start_time)} — {nextAppointment.service_name}
                </p>
                <p className="text-stone-600 mt-0.5">
                  {nextAppointment.client_first_name} {nextAppointment.client_last_name}
                </p>
                {appointmentNotesOf(nextAppointment) ? (
                  <AppointmentNoteBlock
                    text={appointmentNotesOf(nextAppointment)}
                    maxLength={180}
                    className="text-stone-600 text-sm mt-2 pl-3 border-l-2 border-gold/35 max-w-xl"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-serif text-lg text-stone-900 font-medium">
            Citas de hoy ({appointments.length})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-stone-500">Cargando...</div>
          ) : appointments.length === 0 ? (
            <p className="text-stone-500 py-6">No tienes citas programadas para hoy.</p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((a) => {
                const noteText = appointmentNotesOf(a);
                return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-stone-50/80 border border-stone-100"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-stone-900">{formatTime(a.start_time)}</span>
                    <span className="text-stone-600 ml-2">
                      {a.client_first_name} {a.client_last_name} — {a.service_name}
                    </span>
                    {noteText ? (
                      <AppointmentNoteBlock
                        text={noteText}
                        maxLength={110}
                        labelClassName="font-semibold text-stone-600"
                        className="text-stone-500 text-xs mt-1.5 pl-2 border-l-2 border-gold/30"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        a.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : ['cancelled', 'no_show'].includes(a.status)
                          ? 'bg-stone-100 text-stone-600 border-stone-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const today = getLocalDateToday();
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');

  const refreshAppointments = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const data = await appointmentService.getAppointments({ date: today });
      setAppointments((data.appointments ?? []).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    } catch (err) {
      setAppointmentsError(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const data = await dashboardService.getStats({ dateFrom, dateTo });
      setStats(data);
    } catch (err) {
      setStats(null);
      setStatsError(err?.message || 'Error al cargar estadísticas');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    refreshAppointments();
  }, [today]);

  const handleMarkCompleted = async (id) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'completed' });
      navigate(`/payments/new?appointmentId=${id}`);
    } catch (err) {
      setAppointmentsError(err?.message || 'Error al actualizar');
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    if (t instanceof Date) {
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const s = String(t);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()) && s.includes('T')) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    // fallback: encuentra cualquier HH:MM dentro del string
    const iso = s.match(/T(\d{1,2}):(\d{2})/);
    if (iso) {
      const hh = String(iso[1]).padStart(2, '0');
      return `${hh}:${iso[2]}`;
    }
    const any = s.match(/(\d{1,2}):(\d{2})/);
    if (any) {
      const hh = String(any[1]).padStart(2, '0');
      const mm = any[2];
      return `${hh}:${mm}`;
    }
    return s.slice(0, 5);
  };

  const activeAppointments = appointments.filter(
    (a) => !['cancelled', 'no_show', 'completed'].includes(a.status)
  );
  const nextAppointment = activeAppointments[0];

  const totalsToday = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    pending: appointments.filter((a) => ['scheduled', 'confirmed', 'in_progress'].includes(a.status)).length,
  };

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="font-sans text-gold tracking-[0.3em] text-xs font-semibold mb-4">
            Panel de administración
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-stone-900 font-medium tracking-tight">
            Hola, {user?.firstName || 'administrador'}
          </h1>
          <p className="text-stone-600 mt-1">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {stats?.period?.from && stats?.period?.to && (
            <p className="text-xs text-stone-500 mt-2 max-w-xl">
              Periodo: <span className="font-medium text-stone-700">{dateFrom}</span> —{' '}
              <span className="font-medium text-stone-700">{dateTo}</span>
            </p>
          )}
        </div>

        <div className="flex flex-nowrap gap-2 items-center overflow-x-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-premium py-2.5 text-sm min-w-[160px]"
          />
          <span className="text-stone-400 hidden sm:inline">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-premium py-2.5 text-sm min-w-[160px]"
          />
        </div>
      </div>

      {(statsLoading || appointmentsLoading) && (
        <div className="empty-state py-16">Cargando panel…</div>
      )}

      {statsError && (
        <div className="alert-error" role="alert">
          {statsError}
        </div>
      )}
      {appointmentsError && (
        <div className="alert-error" role="alert">
          {appointmentsError}
        </div>
      )}

      {!statsLoading && stats && (
        <>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {(() => {
              const kpiRevenue = Number(stats.sales?.total ?? 0);
              const kpiCompleted = Number(stats.appointments?.completed ?? 0);
              const kpiPending = Number(stats.appointments?.pending ?? 0);
              const kpiClients = Number(stats.totalClients ?? 0);
              const kpiApptTotal = Number(stats.appointments?.total ?? 0);
              const kpiLowStock = Number(stats.lowStockCount ?? 0);
              const kpiTrans = Number(stats.sales?.count ?? 0);

              return (
                <>
                  <DashboardCard
                    eyebrow="Ingresos"
                    eyebrowTone="gold"
                    title="Ventas totales"
                    subtitle={`${kpiTrans} transacciones`}
                    variant="soft"
                  >
                    <DashboardChartPanel>
                      <DualBarKpiChart
                        leftLabel="Ingresos"
                        leftValue={kpiRevenue}
                        leftValueText={formatMoney(kpiRevenue)}
                        rightLabel="Transacciones"
                        rightValue={kpiTrans}
                        rightValueText={String(kpiTrans)}
                        leftTone="gold"
                        rightTone="indigo"
                      />
                    </DashboardChartPanel>
                  </DashboardCard>

                  <DashboardCard
                    eyebrow="Agenda"
                    eyebrowTone="emerald"
                    title="Citas"
                    subtitle={`${kpiPending} pendientes`}
                    variant="soft"
                  >
                    <DashboardChartPanel>
                      <DualBarKpiChart
                        leftLabel="Completadas"
                        leftValue={kpiCompleted}
                        leftValueText={String(kpiCompleted)}
                        rightLabel="Pendientes"
                        rightValue={kpiPending}
                        rightValueText={String(kpiPending)}
                        leftTone="emerald"
                        rightTone="amber"
                      />
                    </DashboardChartPanel>
                  </DashboardCard>

                  <DashboardCard
                    eyebrow="Base"
                    eyebrowTone="violet"
                    title="Clientes"
                    subtitle="Totales del periodo"
                    variant="soft"
                  >
                    <DashboardChartPanel>
                      <DualBarKpiChart
                        leftLabel="Clientes"
                        leftValue={kpiClients}
                        leftValueText={String(kpiClients)}
                        rightLabel="Citas"
                        rightValue={kpiApptTotal}
                        rightValueText={String(kpiApptTotal)}
                        leftTone="violet"
                        rightTone="sky"
                      />
                    </DashboardChartPanel>
                  </DashboardCard>

                  <DashboardCard
                    eyebrow="Inventario"
                    eyebrowTone="rose"
                    title="Stock"
                    subtitle="Productos en riesgo"
                    variant="soft"
                    footer={
                      kpiLowStock > 0 ? (
                        <Link to="/inventory?lowStock=true" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                          Ver inventario con stock bajo
                        </Link>
                      ) : null
                    }
                  >
                    <DashboardChartPanel>
                      <DualBarKpiChart
                        leftLabel="Stock bajo"
                        leftValue={kpiLowStock}
                        leftValueText={String(kpiLowStock)}
                        rightLabel="Alerta"
                        rightValue={kpiLowStock > 0 ? 1 : 0}
                        rightValueText={kpiLowStock > 0 ? 'Sí' : 'No'}
                        leftTone="rose"
                        rightTone="cyan"
                      />
                    </DashboardChartPanel>
                  </DashboardCard>
                </>
              );
            })()}
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <DashboardCard
              className="lg:col-span-4"
              title="Citas de hoy"
              subtitle={new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              variant="soft"
            >
              {appointmentsLoading ? (
                <div className="py-12 text-center text-stone-500">Cargando…</div>
              ) : (
                <DashboardChartPanel>
                  <TodayAppointmentsRing {...totalsToday} />
                </DashboardChartPanel>
              )}
            </DashboardCard>

            <DashboardCard
              className="lg:col-span-8"
              title="Destacados del periodo"
              subtitle="Servicios y barberos con más citas"
              variant="chart"
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <DashboardChartPanel className="min-h-[18rem]">
                  <HorizontalBarsChart
                    title="Servicios más solicitados"
                    subtitle="Top por cantidad de citas"
                    emptyText="Sin datos en el periodo"
                    items={(stats.topServices || []).map((s) => ({
                      label: s.name,
                      count: s.count,
                    }))}
                  />
                </DashboardChartPanel>

                <DashboardChartPanel className="min-h-[18rem]">
                  <HorizontalBarsChart
                    title="Barberos más activos"
                    subtitle="Top por cantidad de citas"
                    emptyText="Sin datos en el periodo"
                    items={(stats.topBarbers || []).map((b) => ({
                      label: `${b.first_name} ${b.last_name}`.trim(),
                      count: b.count,
                    }))}
                  />
                </DashboardChartPanel>
              </div>
            </DashboardCard>
          </div>
        </>
      )}

      {!appointmentsLoading && nextAppointment && (
        <DashboardCard title="Siguiente cita" eyebrow="En curso" eyebrowTone="gold" variant="default">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-serif text-xl font-medium text-stone-900">
                {formatTime(nextAppointment.start_time)} — {nextAppointment.service_name}
              </p>
              <p className="mt-0.5 text-stone-600">
                {nextAppointment.client_first_name} {nextAppointment.client_last_name}
              </p>
              {appointmentNotesOf(nextAppointment) ? (
                <AppointmentNoteBlock
                  text={appointmentNotesOf(nextAppointment)}
                  maxLength={180}
                  className="mt-2 max-w-xl border-l-2 border-gold/35 pl-3 text-sm text-stone-600"
                />
              ) : null}
            </div>
            <button type="button" onClick={() => handleMarkCompleted(nextAppointment.id)} className="btn-dark">
              Marcar completada
            </button>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isBarber = user?.role === 'barber';

  return isBarber ? <BarberDashboard /> : <AdminDashboard />;
}
