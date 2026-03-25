/**
 * Dashboard: Admin (estadísticas) o Barbero (Mi día - citas del día)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as dashboardService from '../../services/dashboardService';
import * as appointmentService from '../../services/appointmentService';
import PageHeader from '../../components/admin/PageHeader';
import StatsCard from '../../components/admin/StatsCard';
import DataCard from '../../components/admin/DataCard';
import {
  BarberDualBarChart,
  TodayAppointmentsRing,
  formatCOP,
} from '../../components/barber/BarberDashboardCharts';

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
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const refreshAll = async () => {
    if (!user?.barberId) return;
    setLoading(true);
    setError('');
    try {
      const data = await appointmentService.getAppointments({
        date: today,
        barberId: user?.barberId,
      });
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setAppointments(list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    } catch (err) {
      setError(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.barberId) return;
    let cancelled = false;
    setMetricsLoading(true);
    dashboardService
      .getStats()
      .then((data) => {
        if (!cancelled && data?.role === 'barber') setMetrics(data);
        else if (!cancelled) setMetrics(null);
      })
      .catch(() => {
        if (!cancelled) setMetrics(null);
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.barberId]);

  useEffect(() => {
    if (user?.barberId) refreshAll();
  }, [user?.barberId, today]);

  const handleMarkCompleted = async (id) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'completed' });
      await refreshAll();
      const data = await dashboardService.getStats().catch(() => null);
      if (data?.role === 'barber') setMetrics(data);
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
    }
  };

  const activeAppointments = appointments.filter(
    (a) => !['cancelled', 'no_show', 'completed'].includes(a.status)
  );
  const nextAppointment = activeAppointments[0];
  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');

  const KpiBlock = ({ title, subtitle, children }) => (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100%] bg-gold/5 pointer-events-none" aria-hidden />
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold mb-1">{title}</h3>
      {subtitle && <p className="text-[11px] text-stone-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );

  const TripleRow = ({ day, week, month }) => (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
      <div className="rounded-xl bg-stone-50/90 border border-stone-100 px-2 py-3">
        <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wide mb-1">Hoy</p>
        <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-tight">{day}</p>
      </div>
      <div className="rounded-xl bg-stone-50/90 border border-stone-100 px-2 py-3">
        <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wide mb-1">Semana</p>
        <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-tight">{week}</p>
      </div>
      <div className="rounded-xl bg-stone-50/90 border border-stone-100 px-2 py-3">
        <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wide mb-1">Mes</p>
        <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-tight">{month}</p>
      </div>
    </div>
  );

  return (
    <div className="page-shell space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="section-label text-gold">Panel del barbero</p>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-stone-900 font-medium tracking-tight">
            Hola, {user?.firstName || 'barbero'}
          </h1>
          <p className="text-stone-600 mt-1">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {metrics?.periodLabels && (
            <p className="text-xs text-stone-500 mt-2 max-w-xl">
              Semana calendario: <span className="font-medium text-stone-700">{metrics.periodLabels.week}</span>. Mes:{' '}
              <span className="font-medium text-stone-700">{metrics.periodLabels.month}</span>.
            </p>
          )}
        </div>
        <Link to="/appointments" className="btn-dark self-start lg:self-auto inline-flex items-center gap-2 shrink-0">
          Todas mis citas
          <span aria-hidden>→</span>
        </Link>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {metricsLoading && !metrics ? (
        <div className="py-12 text-center text-stone-500 rounded-2xl border border-dashed border-stone-200">
          Cargando métricas…
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiBlock
              title="Ingresos cobrados"
              subtitle="Suma de pagos registrados en tus citas (día / semana / mes)."
            >
              <TripleRow
                day={formatCOP(metrics.revenue?.day)}
                week={formatCOP(metrics.revenue?.week)}
                month={formatCOP(metrics.revenue?.month)}
              />
            </KpiBlock>
            <KpiBlock title="Servicios realizados" subtitle="Citas marcadas como completadas.">
              <TripleRow
                day={<span className="tabular-nums">{metrics.cutsCompleted?.day ?? 0}</span>}
                week={<span className="tabular-nums">{metrics.cutsCompleted?.week ?? 0}</span>}
                month={<span className="tabular-nums">{metrics.cutsCompleted?.month ?? 0}</span>}
              />
            </KpiBlock>
            <KpiBlock
              title="Clientes atendidos"
              subtitle="Personas distintas con servicio completado en el periodo."
            >
              <TripleRow
                day={<span className="tabular-nums">{metrics.clientsServed?.day ?? 0}</span>}
                week={<span className="tabular-nums">{metrics.clientsServed?.week ?? 0}</span>}
                month={<span className="tabular-nums">{metrics.clientsServed?.month ?? 0}</span>}
              />
            </KpiBlock>
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-2 relative rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white via-stone-50/50 to-gold/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
              <h2 className="font-serif text-lg text-stone-900 font-medium mb-6">Citas de hoy</h2>
              <TodayAppointmentsRing
                total={metrics.todayAppointments?.total ?? 0}
                completed={metrics.todayAppointments?.completed ?? 0}
                pending={metrics.todayAppointments?.pending ?? 0}
              />
            </div>
            <div className="xl:col-span-3 relative rounded-2xl border border-stone-200/90 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h2 className="font-serif text-lg text-stone-900 font-medium">Últimos 7 días</h2>
                <p className="text-xs text-stone-500">Ingresos vs servicios completados</p>
              </div>
              <BarberDualBarChart data={metrics.chart7d} />
            </div>
          </div>
        </>
      ) : null}

      {!metricsLoading && !metrics && (
        <div
          className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          No se pudieron cargar las estadísticas. Revisa la conexión o actualiza la página.
        </div>
      )}

      {nextAppointment && (
        <div className="panel-card overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
          <div className="p-6">
            <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">Siguiente cita</h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-serif text-xl text-stone-900 font-medium">
                  {formatTime(nextAppointment.start_time)} — {nextAppointment.service_name}
                </p>
                <p className="text-stone-600 mt-0.5">
                  {nextAppointment.client_first_name} {nextAppointment.client_last_name}
                </p>
              </div>
              <button type="button" onClick={() => handleMarkCompleted(nextAppointment.id)} className="btn-dark">
                Marcar completada
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel-card overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <h2 className="font-serif text-lg text-stone-900 font-medium">
            Agenda del día ({appointments.length} citas)
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-stone-500">Cargando citas…</div>
          ) : appointments.length === 0 ? (
            <p className="text-stone-500 py-6">No tienes citas programadas para hoy.</p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4 rounded-xl bg-stone-50/80 border border-stone-100"
                >
                  <div>
                    <span className="font-semibold text-stone-900">{formatTime(a.start_time)}</span>
                    <span className="text-stone-600 ml-2">
                      {a.client_first_name} {a.client_last_name} — {a.service_name}
                    </span>
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
                    {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                      <button
                        type="button"
                        onClick={() => handleMarkCompleted(a.id)}
                        className="text-sm font-semibold text-barber-dark hover:text-gold transition-colors"
                      >
                        Completada
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getStats({ dateFrom, dateTo });
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-stone-500">
          {loading ? 'Cargando estadísticas...' : 'Error al cargar estadísticas'}
        </div>
      </div>
    );
  }

  const formatAmount = (n) => `$${Math.round(parseFloat(n || 0)).toLocaleString('es-CO')}`;

  return (
    <div className="page-shell">
      <PageHeader
        title="Dashboard"
        label="Panel"
        subtitle="Resumen ejecutivo de ventas, citas y operación"
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
            <span className="text-stone-400 hidden sm:inline">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Ventas totales"
          value={formatAmount(stats.sales?.total)}
          sublabel={`${stats.sales?.count || 0} transacciones`}
          variant="primary"
        />
        <StatsCard
          label="Citas completadas"
          value={stats.appointments?.completed ?? 0}
          sublabel={`${stats.appointments?.pending ?? 0} pendientes`}
        />
        <StatsCard label="Clientes totales" value={stats.totalClients ?? 0} />
        <StatsCard
          label="Stock bajo"
          value={
            stats.lowStockCount > 0 ? (
              <Link to="/inventory?lowStock=true" className="text-amber-600 hover:text-amber-700 font-semibold">
                {stats.lowStockCount} producto(s)
              </Link>
            ) : (
              <span className="text-emerald-600">0</span>
            )
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DataCard title="Servicios más solicitados">
          {stats.topServices?.length > 0 ? (
            <ul className="space-y-3">
              {stats.topServices.map((s, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-stone-700">{s.name}</span>
                  <span className="font-semibold text-gold">{s.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500 text-sm">Sin datos en el periodo</p>
          )}
        </DataCard>
        <DataCard title="Barberos más activos">
          {stats.topBarbers?.length > 0 ? (
            <ul className="space-y-3">
              {stats.topBarbers.map((b, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-stone-700">
                    {b.first_name} {b.last_name}
                  </span>
                  <span className="font-semibold text-gold">{b.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500 text-sm">Sin datos en el periodo</p>
          )}
        </DataCard>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isBarber = user?.role === 'barber';

  return isBarber ? <BarberDashboard /> : <AdminDashboard />;
}
