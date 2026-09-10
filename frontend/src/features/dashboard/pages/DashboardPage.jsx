/**
 * Dashboard: Admin (estadísticas) o Barbero (Mi día - citas del día)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { validateQueryDateOrder } from '@/shared/utils/dateRange';
import * as dashboardService from '@/features/dashboard/services/dashboardService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import { appointmentNotesOf } from '@/shared/utils/appointmentTime';
import { AppointmentNoteBlock } from '@/shared/components/AppointmentNoteText';
import DashboardCard, { DashboardChartPanel } from '@/shared/components/admin/DashboardCard';
import LoyaltyRecentGrantsCard from '@/features/loyalty/components/LoyaltyRecentGrantsCard';
import AppointmentRatingsPanel from '@/shared/components/admin/AppointmentRatingsPanel';
import { AdminFilterRow, FilterSelect } from '@/shared/components/admin/AdminListControls';
import {
  AgendaHealthChart,
  BalanceChart,
  BarberRatingRanking,
  HorizontalBarsChart,
  RatingsSummaryChart,
  RevenueTrendChart,
  SplitCompositionChart,
  TodayAppointmentsRing,
} from '@/features/dashboard/components/AdminDashboardCharts';
import { getLocalDateToday, getLocalFirstDayOfMonth } from '@/shared/utils/appointmentTime';
import { formatMoney } from '@/shared/utils/money';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

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
  const toast = useAppToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingPeriod, setRatingPeriod] = useState('30');
  const today = getLocalDateToday();

  const refreshAll = async () => {
    if (!user?.barberId) return;
    setLoading(true);
    try {
      const data = await appointmentService.getAppointments({
        date: today,
        barberId: user?.barberId,
      });
      setAppointments((data.appointments ?? []).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    } catch (err) {
      toast.error(err?.message || 'Error al cargar citas');
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
      toast.error(err?.message || 'Error al cargar valoraciones');
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
          {formatDisplayDate(new Date(), {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: undefined,
          })}
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
            error={null}
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
  const { user, can } = useAuth();
  const toast = useAppToast();

  const [stats, setStats] = useState(null);
  const [dateFrom, setDateFrom] = useState(getLocalFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLocalDateToday());
  const [statsLoading, setStatsLoading] = useState(true);

  const today = getLocalDateToday();
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const refreshAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const data = await appointmentService.getAppointments({ date: today });
      setAppointments((data.appointments ?? []).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    } catch (err) {
      toast.error(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchStats = async () => {
    const rangeCheck = validateQueryDateOrder(dateFrom, dateTo);
    if (!rangeCheck.ok) {
      toast.error(rangeCheck.message);
      setStats(null);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const data = await dashboardService.getStats({ dateFrom, dateTo });
      setStats(data);
    } catch (err) {
      setStats(null);
      toast.error(err?.message || 'Error al cargar estadísticas');
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
            {formatDisplayDate(new Date(), {
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

        {/* Envuelve en vez de desplazarse: dos inputs de 160px no caben en un móvil
            estrecho y el overflow-x-auto anterior generaba scroll horizontal. */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-premium py-2.5 text-sm w-full min-w-0 sm:w-auto sm:min-w-[160px]"
          />
          <span className="text-stone-400 hidden sm:inline">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-premium py-2.5 text-sm w-full min-w-0 sm:w-auto sm:min-w-[160px]"
          />
        </div>
      </div>

      {(statsLoading || appointmentsLoading) && (
        <div className="empty-state py-16">Cargando panel…</div>
      )}

      {!statsLoading && stats && (
        <>
          {/* Fila 1 — Los cuatro indicadores de negocio del periodo. */}
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              eyebrow="Resultado"
              eyebrowTone="gold"
              title="Balance del periodo"
              subtitle={`${Number(stats.sales?.count ?? 0)} ventas registradas`}
              variant="soft"
            >
              <DashboardChartPanel className="h-full">
                <BalanceChart
                  income={stats.balance?.income}
                  expenses={stats.balance?.expenses}
                  difference={stats.balance?.difference}
                  expensesCount={stats.balance?.expensesCount}
                  formatMoney={formatMoney}
                />
              </DashboardChartPanel>
            </DashboardCard>

            <DashboardCard
              eyebrow="Ingresos"
              eyebrowTone="indigo"
              title="Origen del ingreso"
              subtitle="Servicios frente a productos"
              variant="soft"
            >
              <DashboardChartPanel className="h-full">
                <SplitCompositionChart
                  primaryLabel="Servicios"
                  primaryValue={stats.revenueMix?.services}
                  primaryPct={stats.revenueMix?.servicesPct}
                  secondaryLabel="Productos"
                  secondaryValue={stats.revenueMix?.products}
                  secondaryPct={stats.revenueMix?.productsPct}
                  formatValue={formatMoney}
                  emptyText="Sin ventas en el periodo"
                  extraNote={
                    // Siempre se muestra el total: además de informar, ancla la
                    // tarjeta al fondo cuando el grid la agranda para igualar
                    // la altura de una vecina más alta.
                    Number(stats.revenueMix?.manual ?? 0) > 0
                      ? `Total: ${formatMoney(stats.revenueMix?.total)} (incluye ${formatMoney(stats.revenueMix.manual)} en cobros manuales)`
                      : `Total facturado en el periodo: ${formatMoney(stats.revenueMix?.total)}`
                  }
                />
              </DashboardChartPanel>
            </DashboardCard>

            <DashboardCard
              eyebrow="Clientes"
              eyebrowTone="violet"
              title="Nuevos y recurrentes"
              subtitle="Atendidos en el periodo"
              variant="soft"
            >
              <DashboardChartPanel className="h-full">
                <SplitCompositionChart
                  primaryLabel="Nuevos"
                  primaryValue={stats.clientsMix?.new}
                  primaryPct={stats.clientsMix?.newPct}
                  secondaryLabel="Recurrentes"
                  secondaryValue={stats.clientsMix?.returning}
                  secondaryPct={Math.max(0, 100 - Number(stats.clientsMix?.newPct ?? 0))}
                  formatValue={(v) => String(Number(v ?? 0))}
                  emptyText="Sin clientes atendidos en el periodo"
                  extraNote={`${Number(stats.clientsMix?.attended ?? 0)} clientes distintos atendidos`}
                />
              </DashboardChartPanel>
            </DashboardCard>

            <DashboardCard
              eyebrow="Agenda"
              eyebrowTone="emerald"
              title="Cumplimiento"
              subtitle={`${Number(stats.agenda?.completionRate ?? 0)}% de citas completadas`}
              variant="soft"
            >
              <DashboardChartPanel className="h-full">
                <AgendaHealthChart
                  completed={stats.agenda?.completed}
                  pending={stats.agenda?.pending}
                  cancelled={stats.agenda?.cancelled}
                  noShow={stats.agenda?.noShow}
                  total={stats.agenda?.total}
                />
              </DashboardChartPanel>
            </DashboardCard>
          </div>

          {/* Fila 2 — Evolución de las ventas y foto del día. */}
          <div className="grid gap-5 lg:grid-cols-12">
            <DashboardCard
              className="lg:col-span-8"
              title="Evolución de los ingresos"
              subtitle="Ventas de cada día del periodo"
              variant="chart"
            >
              <DashboardChartPanel className="min-h-[18rem]">
                <RevenueTrendChart data={stats.revenueByDay} formatMoney={formatMoney} />
              </DashboardChartPanel>
            </DashboardCard>

            <DashboardCard
              className="lg:col-span-4"
              title="Citas de hoy"
              subtitle={formatDisplayDate(new Date(), {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: undefined,
              })}
              variant="soft"
            >
              {appointmentsLoading ? (
                <div className="py-12 text-center text-stone-500">Cargando…</div>
              ) : (
                <div className="flex h-full flex-col gap-3">
                  <DashboardChartPanel>
                    <TodayAppointmentsRing {...totalsToday} />
                  </DashboardChartPanel>

                  {/* La tarjeta quedaba a medio llenar con solo el anillo. Las
                      próximas citas del día ya están cargadas en memoria, así
                      que se listan aquí sin ninguna petición extra. */}
                  <DashboardChartPanel className="flex flex-1 flex-col">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Próximas de hoy
                    </p>

                    {activeAppointments.length === 0 ? (
                      <p className="flex flex-1 items-center text-sm text-stone-500">
                        No quedan citas pendientes para hoy.
                      </p>
                    ) : (
                      <ul className="flex-1 divide-y divide-stone-200/70">
                        {activeAppointments.slice(0, 4).map((a) => (
                          <li key={a.id}>
                            <Link
                              to={`/appointments/${a.id}/edit`}
                              className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white"
                            >
                              <span className="shrink-0 text-sm font-semibold tabular-nums text-gold-dark">
                                {formatTime(a.start_time)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-stone-800">
                                  {a.client_first_name} {a.client_last_name}
                                </span>
                                <span className="block truncate text-[11px] text-stone-500">
                                  {a.service_name}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeAppointments.length > 4 && (
                      <Link
                        to="/appointments"
                        className="mt-2 block text-[11px] font-semibold text-gold-dark hover:underline"
                      >
                        Ver las {activeAppointments.length} citas pendientes
                      </Link>
                    )}
                  </DashboardChartPanel>
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Fila 3 — Qué deja más plata. */}
          <DashboardCard
            title="Rendimiento del periodo"
            subtitle="Lo que más ingreso genera, no solo lo que más se pide"
            variant="chart"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <DashboardChartPanel className="min-h-[18rem]">
                <HorizontalBarsChart
                  title="Servicios más rentables"
                  subtitle="Top por ingreso generado"
                  emptyText="Sin servicios cobrados en el periodo"
                  items={(stats.topServicesByRevenue || []).map((s) => ({
                    label: s.name,
                    count: s.revenue,
                    note: `${s.count} ${s.count === 1 ? 'servicio cobrado' : 'servicios cobrados'}`,
                  }))}
                  formatValue={(it) => formatMoney(it.count)}
                />
              </DashboardChartPanel>

              <DashboardChartPanel className="min-h-[18rem]">
                <HorizontalBarsChart
                  title="Productos más vendidos"
                  subtitle="Top por unidades vendidas"
                  emptyText="Sin productos vendidos en el periodo"
                  items={(stats.topProducts || []).map((p) => ({
                    label: p.name,
                    count: p.quantity,
                    note: `${formatMoney(p.revenue)} en ventas`,
                  }))}
                  valueSuffix="uds."
                />
              </DashboardChartPanel>
            </div>
          </DashboardCard>

          {/* Fila 4 — Satisfacción del cliente y desempeño del equipo. */}
          <div className="grid gap-5 lg:grid-cols-12">
            <DashboardCard
              className="lg:col-span-5"
              eyebrow="Satisfacción"
              eyebrowTone="gold"
              title="Valoración de los clientes"
              subtitle="Citas completadas y valoradas en el periodo"
              variant="soft"
            >
              <DashboardChartPanel className="h-full">
                <RatingsSummaryChart
                  average={stats.ratings?.average}
                  count={stats.ratings?.count}
                  distribution={stats.ratings?.distribution}
                />
              </DashboardChartPanel>
            </DashboardCard>

            <DashboardCard
              className="lg:col-span-7"
              eyebrow="Equipo"
              eyebrowTone="emerald"
              title="Desempeño de los barberos"
              subtitle="Calificación promedio recibida en el periodo"
              variant="soft"
            >
              <DashboardChartPanel className="h-full">
                <BarberRatingRanking items={stats.barberRatings} />
              </DashboardChartPanel>
            </DashboardCard>
          </div>

          {/* Stock bajo: antes era un gráfico de dos barras que comparaba el
              conteo contra un "Sí/No". Ahora es la lista de lo que falta, que es
              lo accionable. */}
          {Number(stats.lowStockCount ?? 0) > 0 && (
            <DashboardCard
              eyebrow="Inventario"
              eyebrowTone="rose"
              title="Productos en riesgo de agotarse"
              subtitle={`${stats.lowStockCount} ${Number(stats.lowStockCount) === 1 ? 'producto está' : 'productos están'} en su mínimo o por debajo`}
              variant="soft"
              footer={
                <Link
                  to="/inventory?lowStock=true"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Ver inventario con stock bajo
                </Link>
              }
            >
              {/* Cada fila lleva al detalle del producto (`/inventory/:id`), para
                  no obligar a buscarlo a mano en el listado de inventario.
                  Ojo con los nombres de campo: `getLowStock` devuelve `minStock`
                  en camelCase — leer `min_stock` daba siempre 0. */}
              <ul className="divide-y divide-stone-100">
                {(stats.lowStockAlerts || []).slice(0, 5).map((p) => {
                  const quantity = Number(p.quantity ?? 0);
                  const minStock = Number(p.minStock ?? 0);
                  const missing = Math.max(0, minStock - quantity);

                  return (
                    <li key={p.id}>
                      <Link
                        to={`/inventory/${p.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-rose-50/60"
                        title={`Ver ${p.name} en inventario`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-stone-800">
                            {p.name}
                          </span>
                          <span className="block text-[11px] text-stone-500">
                            {quantity === 0
                              ? 'Agotado'
                              : missing > 0
                              ? `Faltan ${missing} para el mínimo`
                              : 'Justo en el mínimo'}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums text-rose-600">
                            {quantity}
                          </span>
                          <span className="block text-[11px] text-stone-500">
                            mínimo {minStock}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </DashboardCard>
          )}
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
            {/* Antes había aquí un botón "Marcar completada" que SIEMPRE fallaba:
                el backend rechaza `completed` como cambio manual
                (`isManualAdminStatus` solo admite confirmar, cancelar y
                no-asistió), porque a completada la promueve sola la
                automatización al terminar la hora de la cita. En su lugar se
                lleva a la cita, que es lo que el administrador puede gestionar
                de verdad. */}
            <Link
              to={`/appointments/${nextAppointment.id}/edit`}
              className="btn-dark inline-flex items-center gap-2"
            >
              <span>Ver cita</span>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </DashboardCard>
      )}

      {can('loyalty.view') && <LoyaltyRecentGrantsCard />}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isBarber = user?.role === 'barber';

  return isBarber ? <BarberDashboard /> : <AdminDashboard />;
}
