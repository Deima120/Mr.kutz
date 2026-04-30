/**
 * Dashboard: Admin (estadísticas) o Barbero (Mi día - citas del día)
 */

import { useState, useEffect, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as dashboardService from '@/features/dashboard/services/dashboardService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import { appointmentNotesOf } from '@/shared/utils/appointmentTime';
import { AppointmentNoteBlock } from '@/shared/components/AppointmentNoteText';
import PageHeader from '@/shared/components/admin/PageHeader';
import StatsCard from '@/shared/components/admin/StatsCard';
import DataCard from '@/shared/components/admin/DataCard';
import AppointmentRatingsPanel from '@/shared/components/admin/AppointmentRatingsPanel';

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
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingError, setRatingError] = useState('');
  const [ratingPeriod, setRatingPeriod] = useState('30');
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

  const handleMarkCompleted = async (id) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'completed' });
      navigate(`/payments/new?appointmentId=${id}`);
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
    }
  };

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

  const KpiBlock = ({ title, subtitle, children }) => (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100%] bg-gold/5 pointer-events-none" aria-hidden />
      <h3 className="text-xs font-bold tracking-[0.18em] text-gold mb-1">{title}</h3>
      {subtitle && <p className="text-[11px] text-stone-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );

  const TripleRow = ({ day, week, month }) => (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
      <div className="rounded-xl bg-stone-50/90 border border-stone-100 px-2 py-3">
        <p className="text-[10px] font-semibold text-stone-500 tracking-wide mb-1">Hoy</p>
        <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-tight">{day}</p>
      </div>
      <div className="rounded-xl bg-stone-50/90 border border-stone-100 px-2 py-3">
        <p className="text-[10px] font-semibold text-stone-500 tracking-wide mb-1">Semana</p>
        <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-tight">{week}</p>
      </div>
      <div className="rounded-xl bg-stone-50/90 border border-stone-100 px-2 py-3">
        <p className="text-[10px] font-semibold text-stone-500 tracking-wide mb-1">Mes</p>
        <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-tight">{month}</p>
      </div>
    </div>
  );

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
        <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-lg text-stone-900 font-medium">Tus valoraciones</h2>
          <div>
            <label className="sr-only" htmlFor="barber-rating-period">
              Periodo de valoraciones
            </label>
            <select
              id="barber-rating-period"
              value={ratingPeriod}
              onChange={(e) => setRatingPeriod(e.target.value)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold"
            >
              <option value="30">Últimos 30 días</option>
              <option value="all">Todos</option>
            </select>
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
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');

  const refreshAppointments = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const data = await appointmentService.getAppointments({ date: today });
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setAppointments(list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
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

  const formatAmount = (n) => `$${Math.round(parseFloat(n || 0)).toLocaleString('es-CO')}`;
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

  const KpiBlock = ({ title, subtitle, value, ratio = 0 }) => (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100%] bg-gold/5 pointer-events-none" aria-hidden />
      <h3 className="text-xs font-bold tracking-[0.18em] text-gold mb-1">{title}</h3>
      {subtitle && <p className="text-[11px] text-stone-500 mb-4">{subtitle}</p>}
      <p className="font-serif text-2xl md:text-3xl font-medium text-stone-900">{value}</p>
      <div className="mt-4">
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
            style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );

  const SalesBarsKpi = ({ revenue, transactionCount, ratioRevenue = 0, ratioTransactions = 0 }) => (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100%] bg-gold/5 pointer-events-none" aria-hidden />
      <h3 className="text-xs font-bold tracking-[0.18em] text-gold mb-1">Ventas totales</h3>
      <p className="text-[11px] text-stone-500 mb-4">{transactionCount} transacciones</p>

      <p className="font-serif text-2xl md:text-3xl font-medium text-stone-900">{formatAmount(revenue)}</p>

      <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
        <div className="h-40 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <span className="h-px bg-stone-200 w-full" aria-hidden />
            <span className="h-px bg-stone-200 w-full" aria-hidden />
            <span className="h-px bg-stone-200 w-full" aria-hidden />
            <span className="h-px bg-stone-200 w-full" aria-hidden />
          </div>

          <div className="absolute inset-0 flex items-end justify-center gap-8 px-4 pb-1">
            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-gold-dark via-gold to-gold-light shadow-sm"
                style={{ height: `${Math.max(8, Math.round(Math.max(0, Math.min(1, ratioRevenue)) * 120))}px` }}
                title={`Ingresos: ${formatAmount(revenue)}`}
                aria-label={`Barra de ingresos ${formatAmount(revenue)}`}
              />
              <span className="text-[11px] font-medium text-stone-600">Ingresos</span>
            </div>

            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-stone-700 to-stone-500 shadow-sm"
                style={{ height: `${Math.max(8, Math.round(Math.max(0, Math.min(1, ratioTransactions)) * 120))}px` }}
                title={`Transacciones: ${transactionCount}`}
                aria-label={`Barra de transacciones ${transactionCount}`}
              />
              <span className="text-[11px] font-medium text-stone-600">Transacciones</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
            <p className="text-stone-500">Ingresos</p>
            <p className="font-semibold text-stone-900">{formatAmount(revenue)}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
            <p className="text-stone-500">Transacciones</p>
            <p className="font-semibold text-stone-900">{transactionCount}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const TwoBarsKpi = ({
    title,
    subtitle,
    leftLabel,
    leftValue,
    leftValueText,
    rightLabel,
    rightValue,
    rightValueText,
    leftTone = 'gold',
    rightTone = 'stone',
  }) => {
    const max = Math.max(Number(leftValue || 0), Number(rightValue || 0), 1);
    const leftHeight = Math.max(10, Math.round((Number(leftValue || 0) / max) * 120));
    const rightHeight = Math.max(10, Math.round((Number(rightValue || 0) / max) * 120));

    const barClass = (tone) => {
      switch (tone) {
        case 'emerald':
          return 'bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 shadow-sm';
        case 'amber':
          return 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 shadow-sm';
        case 'gold':
          return 'bg-gradient-to-t from-gold-dark via-gold to-gold-light shadow-sm';
        case 'indigo':
          return 'bg-gradient-to-t from-indigo-800 via-indigo-600 to-indigo-400 shadow-sm';
        case 'violet':
          return 'bg-gradient-to-t from-violet-800 via-violet-600 to-violet-400 shadow-sm';
        case 'sky':
          return 'bg-gradient-to-t from-sky-800 via-sky-600 to-sky-400 shadow-sm';
        case 'rose':
          return 'bg-gradient-to-t from-rose-800 via-rose-600 to-rose-400 shadow-sm';
        case 'cyan':
          return 'bg-gradient-to-t from-cyan-800 via-cyan-600 to-cyan-400 shadow-sm';
        case 'stone':
        default:
          return 'bg-gradient-to-t from-stone-700 to-stone-500 shadow-sm';
      }
    };

    const titleAccentClass = (tone) => {
      switch (tone) {
        case 'gold':
          return 'text-gold';
        case 'emerald':
          return 'text-emerald-700';
        case 'amber':
          return 'text-amber-700';
        case 'indigo':
          return 'text-indigo-700';
        case 'violet':
          return 'text-violet-700';
        case 'sky':
          return 'text-sky-700';
        case 'rose':
          return 'text-rose-700';
        case 'cyan':
          return 'text-cyan-700';
        default:
          return 'text-stone-500';
      }
    };

    return (
      <div className="min-w-0">
        <div className="mb-3">
          <h3 className={`text-xs font-bold tracking-[0.18em] ${titleAccentClass(leftTone)} mb-1`}>
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
        </div>

        <div className="h-40 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <span className="h-px bg-stone-200 w-full" aria-hidden />
            <span className="h-px bg-stone-200 w-full" aria-hidden />
            <span className="h-px bg-stone-200 w-full" aria-hidden />
            <span className="h-px bg-stone-200 w-full" aria-hidden />
          </div>

          <div className="absolute inset-0 flex items-end justify-center gap-8 px-4 pb-1">
            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className={`w-full rounded-t-md ${barClass(leftTone)}`}
                style={{ height: `${leftHeight}px` }}
                title={`${leftLabel}: ${leftValueText}`}
                aria-label={`Barra ${leftLabel}`}
              />
              <div className="text-center">
                <div className="text-[11px] font-medium text-stone-600">{leftLabel}</div>
                <div className="text-xs font-semibold text-stone-800">{leftValueText}</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className={`w-full rounded-t-md ${barClass(rightTone)}`}
                style={{ height: `${rightHeight}px` }}
                title={`${rightLabel}: ${rightValueText}`}
                aria-label={`Barra ${rightLabel}`}
              />
              <div className="text-center">
                <div className="text-[11px] font-medium text-stone-600">{rightLabel}</div>
                <div className="text-xs font-semibold text-stone-800">{rightValueText}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminTodayAppointmentsRing = ({ total, completed, pending }) => {
    const gradId = useId().replace(/:/g, '');
    const t = total || 0;
    const c = completed || 0;
    const pct = t > 0 ? Math.round((c / t) * 100) : 0;
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-stone-200"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#713f12" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="font-serif text-2xl font-semibold text-stone-900">{t}</span>
            <span className="text-[10px] tracking-wider text-stone-500 font-semibold">Citas hoy</span>
          </div>
        </div>

        <ul className="flex-1 space-y-2 text-sm w-full max-w-xs">
          <li className="flex justify-between gap-4 py-2 border-b border-stone-100">
            <span className="text-stone-600">Completadas</span>
            <span className="font-semibold text-emerald-700 tabular-nums">{c}</span>
          </li>
          <li className="flex justify-between gap-4 py-2 border-b border-stone-100">
            <span className="text-stone-600">Pendientes / en curso</span>
            <span className="font-semibold text-amber-800 tabular-nums">{pending}</span>
          </li>
          <li className="flex justify-between gap-4 py-2 text-stone-500 text-xs">
            <span>Progreso del día</span>
            <span className="tabular-nums">{pct}%</span>
          </li>
        </ul>
      </div>
    );
  };

  const BarsChartCard = ({ title, subtitle, items, emptyText, valueSuffix = 'citas' }) => {
    const max = Math.max(...(items || []).map((i) => i.count), 1);
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-serif text-sm text-stone-900 font-medium mb-1">{title}</h3>
          {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
        </div>

        {items?.length ? (
          <div className="space-y-3">
            {items.map((it, idx) => {
              const pct = Math.round((it.count / max) * 100);
              return (
                <div key={`${it.label || idx}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-stone-700 text-sm truncate">{it.label}</span>
                    <span className="font-semibold text-gold tabular-nums">
                      {it.count} {valueSuffix}
                    </span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-stone-500 text-sm">{emptyText}</p>
        )}
      </div>
    );
  };

  return (
    <div className="page-shell space-y-8">
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
        <div className="py-12 text-center text-stone-500 rounded-2xl border border-dashed border-stone-200">
          Cargando panel…
        </div>
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(() => {
              const kpiRevenue = Number(stats.sales?.total ?? 0);
              const kpiCompleted = Number(stats.appointments?.completed ?? 0);
              const kpiPending = Number(stats.appointments?.pending ?? 0);
              const kpiClients = Number(stats.totalClients ?? 0);
              const kpiLowStock = Number(stats.lowStockCount ?? 0);
              const kpiTrans = Number(stats.sales?.count ?? 0);

              return (
                <>
                  <TwoBarsKpi
                    title="Ventas totales"
                    subtitle={`${kpiTrans} transacciones`}
                    leftLabel="Ingresos"
                    leftValue={kpiRevenue}
                    leftValueText={formatAmount(kpiRevenue)}
                    rightLabel="Transacciones"
                    rightValue={kpiTrans}
                    rightValueText={String(kpiTrans)}
                    leftTone="gold"
                    rightTone="indigo"
                  />

                  <TwoBarsKpi
                    title="Citas"
                    subtitle={`${kpiPending} pendientes`}
                    leftLabel="Completadas"
                    leftValue={kpiCompleted}
                    leftValueText={String(kpiCompleted)}
                    rightLabel="Pendientes"
                    rightValue={kpiPending}
                    rightValueText={String(kpiPending)}
                    leftTone="emerald"
                    rightTone="amber"
                  />

                  <TwoBarsKpi
                    title="Clientes"
                    subtitle="Totales del periodo"
                    leftLabel="Clientes"
                    leftValue={kpiClients}
                    leftValueText={String(kpiClients)}
                    rightLabel="Base"
                    rightValue={0}
                    rightValueText="—"
                    leftTone="violet"
                    rightTone="sky"
                  />

                  <div className="min-w-0">
                    <TwoBarsKpi
                      title="Stock"
                      subtitle="Productos en riesgo"
                      leftLabel="Stock bajo"
                      leftValue={kpiLowStock}
                      leftValueText={String(kpiLowStock)}
                      rightLabel="Ok"
                      rightValue={0}
                      rightValueText="—"
                      leftTone="rose"
                      rightTone="cyan"
                    />
                    {kpiLowStock > 0 && (
                      <div className="mt-3 text-xs">
                        <Link to="/inventory?lowStock=true" className="text-rose-600 hover:text-rose-700 font-semibold">
                          Ver inventario con stock bajo
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2 relative rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white via-stone-50/50 to-gold/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
              <h2 className="font-serif text-lg text-stone-900 font-medium mb-6">Citas de hoy</h2>
              {appointmentsLoading ? (
                <div className="py-10 text-center text-stone-500">Cargando…</div>
              ) : (
                <AdminTodayAppointmentsRing {...totalsToday} />
              )}
            </div>

            <div className="xl:col-span-3 relative rounded-2xl border border-stone-200/90 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h2 className="font-serif text-lg text-stone-900 font-medium">Destacados del periodo</h2>
                <p className="text-xs text-stone-500">Servicios y barberos</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <BarsChartCard
                  title="Servicios más solicitados"
                  subtitle="Top por cantidad de citas"
                  emptyText="Sin datos en el periodo"
                  items={(stats.topServices || []).map((s) => ({
                    label: s.name,
                    count: s.count,
                  }))}
                />

                <BarsChartCard
                  title="Barberos más activos"
                  subtitle="Top por cantidad de citas"
                  emptyText="Sin datos en el periodo"
                  items={(stats.topBarbers || []).map((b) => ({
                    label: `${b.first_name} ${b.last_name}`.trim(),
                    count: b.count,
                  }))}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!appointmentsLoading && nextAppointment && (
        <div className="panel-card overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
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
              <button type="button" onClick={() => handleMarkCompleted(nextAppointment.id)} className="btn-dark">
                Marcar completada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isBarber = user?.role === 'barber';

  return isBarber ? <BarberDashboard /> : <AdminDashboard />;
}
