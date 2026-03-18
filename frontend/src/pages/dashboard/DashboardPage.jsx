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
  const today = new Date().toISOString().slice(0, 10);

  const fetchAppointments = async () => {
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
    if (user?.barberId) fetchAppointments();
  }, [user?.barberId, today]);

  const handleMarkCompleted = async (id) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'completed' });
      fetchAppointments();
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
    }
  };

  const activeAppointments = appointments.filter(
    (a) => !['cancelled', 'no_show', 'completed'].includes(a.status)
  );
  const nextAppointment = activeAppointments[0];
  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');

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
            Ver todas mis citas
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      {nextAppointment && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
          <div className="h-1 w-full bg-gold/80" aria-hidden />
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
              <button
                type="button"
                onClick={() => handleMarkCompleted(nextAppointment.id)}
                className="px-5 py-2.5 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal transition-colors text-sm"
              >
                Marcar completada
              </button>
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
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-stone-50/80 border border-stone-100"
                >
                  <div>
                    <span className="font-semibold text-stone-900">{formatTime(a.start_time)}</span>
                    <span className="text-stone-600 ml-2">
                      {a.client_first_name} {a.client_last_name} — {a.service_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
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
        <div className="text-gray-500">
          {loading ? 'Cargando estadísticas...' : 'Error al cargar estadísticas'}
        </div>
      </div>
    );
  }

  const formatAmount = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen de ventas, citas y métricas"
        actions={
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  <span className="text-gray-700">{s.name}</span>
                  <span className="font-semibold text-primary-600">{s.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Sin datos en el periodo</p>
          )}
        </DataCard>
        <DataCard title="Barberos más activos">
          {stats.topBarbers?.length > 0 ? (
            <ul className="space-y-3">
              {stats.topBarbers.map((b, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">
                    {b.first_name} {b.last_name}
                  </span>
                  <span className="font-semibold text-primary-600">{b.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Sin datos en el periodo</p>
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
