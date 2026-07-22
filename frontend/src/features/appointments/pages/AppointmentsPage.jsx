/**
 * Listado y calendario de citas
 * Vista cliente: cards y flujo simple. Admin/Barber: tabla y filtros.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Star, Plus, ArrowRight, Pencil, Clock, User, Ban, CalendarDays } from 'lucide-react';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as barberService from '@/features/barbers/services/barberService';
import { useAuth } from '@/shared/contexts/AuthContext';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import { AdminPagination, AdminFilterDate, AdminFilterRow, FilterSelect } from '@/shared/components/admin/AdminListControls';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import RatingStars from '@/shared/components/admin/RatingStars';
import { AppointmentNoteBlock, AppointmentNoteEllipsis } from '@/shared/components/AppointmentNoteText';
import AppointmentForm from '@/features/appointments/components/AppointmentForm';
import AppointmentActionToggles from '@/features/appointments/components/AppointmentActionToggles';
import { AdminBackNav } from '@/shared/components/admin/AdminFormShell';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import {
  getEffectiveAppointmentStatus,
  canConfirmAppointment,
  canCancelAppointment,
  isAppointmentActionsLocked,
} from '@/features/appointments/utils/appointmentStatusAutomation';
import SuccessToast from '@/shared/components/SuccessToast';
import {
  formatAppointmentClockTime,
  formatAppointmentCalendarDate,
  extractAppointmentDateYmd,
  appointmentNotesOf,
  getLocalDateToday,
} from '@/shared/utils/appointmentTime';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const CLIENT_PAGE_SIZE_OPTIONS = [3, 6, 9, 12];
/** Altura estimada de una tarjeta en la grilla cliente. */
const CLIENT_CARD_ESTIMATE_PX = 152;

/** Filtro de estado en vista cliente → valores API (coma = OR). */
const CLIENT_STATUS_FILTER_OPTIONS = [
  { id: 'scheduled', label: 'Agendada', apiStatus: 'scheduled,confirmed,in_progress' },
  { id: 'completed', label: 'Completada', apiStatus: 'completed' },
  { id: 'cancelled', label: 'Cancelada', apiStatus: 'cancelled' },
];

function clientStatusApiParam(filterId) {
  return CLIENT_STATUS_FILTER_OPTIONS.find((o) => o.id === filterId)?.apiStatus || '';
}

function clientGridCols(width) {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

function AppointmentsPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'citas',
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className = '',
}) {
  return (
    <AdminPagination
      idPrefix="appointments"
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      itemLabel={itemLabel}
      showSummary
      layout="bar"
      className={className}
    />
  );
}

/** Barra de filtros/paginación a ancho completo (vista cliente). */
function ClientAppointmentsToolbar({
  filterStatus,
  onFilterStatusChange,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const isDisabled = total <= 0;

  return (
    <div className="w-full flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4 pb-3 border-b border-stone-200/80 animate-fade-in">
      <FilterSelect
        id="client-appointments-status"
        label="Estado"
        value={filterStatus}
        onChange={onFilterStatusChange}
        ariaLabel="Filtrar citas por estado"
        className="w-full sm:w-48 lg:w-52 shrink-0"
        options={CLIENT_STATUS_FILTER_OPTIONS.map(({ id, label }) => ({ id, label }))}
      />

      <p className="text-xs sm:text-sm text-stone-500 font-semibold lg:flex-1 lg:text-center lg:pb-2.5 order-last lg:order-none">
        Página {safePage} de {totalPages} · {total} citas
      </p>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full lg:w-auto lg:ml-auto shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor="client-appointments-page-size" className="text-xs font-semibold text-stone-500 whitespace-nowrap">
            Por página
          </label>
          <select
            id="client-appointments-page-size"
            value={String(pageSize)}
            disabled={isDisabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-9 min-w-[4.5rem] rounded-lg border border-stone-200 bg-white px-2 text-sm font-medium text-stone-800 focus:border-gold/50 focus:ring-2 focus:ring-gold/25 outline-none disabled:opacity-50"
          >
            {(CLIENT_PAGE_SIZE_OPTIONS.includes(pageSize)
              ? CLIENT_PAGE_SIZE_OPTIONS
              : [...CLIENT_PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b)
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2" role="navigation" aria-label="Cambiar página">
          <button
            type="button"
            disabled={isDisabled || safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            className="h-9 px-3 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm font-semibold text-stone-800 tabular-nums min-w-[2.75rem] text-center">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={isDisabled || safePage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            className="h-9 px-3 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function EditAppointmentButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm transition-colors hover:border-gold/50 hover:bg-gold/5 hover:text-gold-dark ${className}`}
      aria-label="Editar cita"
      title="Editar cita"
    >
      <Pencil className="w-4 h-4" strokeWidth={2} aria-hidden />
    </button>
  );
}

function CancelAppointmentButton({ onClick, className = '', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border border-red-200 bg-white text-red-600 text-xs sm:text-sm font-medium shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 ${className}`}
      aria-label="Cancelar cita"
      title="Cancelar cita"
    >
      <Ban className="w-4 h-4" strokeWidth={2} aria-hidden />
      <span className="whitespace-nowrap">Cancelar</span>
    </button>
  );
}

function CancelAppointmentModal({ appointment, open, onClose, onConfirm, confirming }) {
  if (!appointment) return null;

  const serviceName = appointment.service_name || 'Servicio';
  const dateLabel = formatAppointmentCalendarDate(appointment.appointment_date);
  const timeLabel = formatAppointmentClockTime(appointment.start_time);

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title="¿Deseas cancelar esta cita?"
      size="sm"
      preventClose={confirming}
      panelClassName="animate-fade-in-up"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="btn-outline w-full sm:w-auto"
          >
            Volver
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {confirming ? 'Cancelando…' : 'Sí, cancelar cita'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">Servicio</p>
          <p className="font-serif text-lg sm:text-xl font-semibold text-stone-900 leading-snug">
            {serviceName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
              Fecha
            </p>
            <p className="text-sm sm:text-base font-semibold text-stone-900 capitalize leading-snug">
              {dateLabel}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
              Hora
            </p>
            <p className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums leading-snug">
              {timeLabel}
            </p>
          </div>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">
          Esta acción marcará la cita como cancelada. Podrás agendar una nueva cuando quieras.
        </p>
      </div>
    </AdminModalShell>
  );
}

const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_BADGE_CLASS = {
  scheduled: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  in_progress: 'bg-sky-50 text-sky-800 border-sky-200',
  completed: 'bg-stone-100 text-stone-700 border-stone-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-red-50 text-red-700 border-red-200',
};

function AppointmentStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${
        STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.scheduled
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/** API devuelve camelCase; toleramos snake_case por si el proxy serializa distinto */
function clientRatingOf(a) {
  const r = a?.clientRating ?? a?.client_rating;
  if (r == null || r === '') return null;
  const n = Number(r);
  return Number.isFinite(n) ? n : null;
}

function clientRatingCommentOf(a) {
  return a?.clientRatingComment ?? a?.client_rating_comment ?? null;
}

function ClientAppointmentRatingForm({ appointmentId, onSuccess }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (stars < 1) {
      setErr('Elige una puntuación de 1 a 5.');
      return;
    }
    setSending(true);
    setErr('');
    try {
      await appointmentService.submitAppointmentRating(appointmentId, { rating: stars, comment });
      onSuccess?.();
    } catch (e) {
      setErr(e?.message || 'No se pudo guardar la valoración');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-stone-100">
      <p className="text-sm font-medium text-stone-800 mb-2">¿Cómo fue tu visita?</p>
      <div className="flex gap-1 mb-3" role="group" aria-label="Puntuación de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setStars(n);
              setErr('');
            }}
            className="p-0.5 rounded transition-colors"
            aria-pressed={n <= stars}
            aria-label={`${n} estrellas`}
          >
            <Star
              className={`w-7 h-7 ${n <= stars ? 'fill-amber-500 text-amber-500' : 'fill-none text-stone-200 hover:text-stone-300'}`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <label className="block text-xs font-semibold text-stone-600 mb-1">Comentario (opcional)</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={2000}
        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold resize-none"
        placeholder="Cuéntanos tu experiencia…"
      />
      {err && (
        <p className="text-red-600 text-xs mt-2" role="alert">
          {err}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={sending}
        className="mt-3 w-full sm:w-auto px-5 py-2.5 bg-gold/90 text-barber-dark font-semibold rounded-xl hover:bg-gold disabled:opacity-60 text-sm"
      >
        {sending ? 'Enviando…' : 'Enviar valoración'}
      </button>
    </div>
  );
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [barbers, setBarbers] = useState([]);
  const [filterDate, setFilterDate] = useState(
    getLocalDateToday()
  );
  const [filterBarber, setFilterBarber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [filterStatus, setFilterStatus] = useState('scheduled');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [formView, setFormView] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const clientListRef = useRef(null);
  const pageSizeManualRef = useRef(false);

  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  const isClient = user?.role === 'client';

  const fetchAppointments = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        limit: pageSize,
        offset: (targetPage - 1) * pageSize,
      };
      if (!isClient) params.date = filterDate;
      if (isAdmin && filterBarber) params.barberId = filterBarber;
      if (isBarber && user?.barberId) params.barberId = user.barberId;
      if (isClient) {
        params.clientId = user?.clientId;
        const statusParam = clientStatusApiParam(filterStatus);
        if (statusParam) params.status = statusParam;
      }
      const data = await appointmentService.getAppointments(params);
      setAppointments(data.appointments ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err?.message || 'Error al cargar citas');
      setAppointments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      barberService.getBarbers().then((b) => {
        setBarbers(Array.isArray(b) ? b : b?.data ?? []);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isBarber && !user?.barberId) return;
    if (isClient && !user?.clientId) return;
    fetchAppointments();
  }, [filterDate, filterBarber, filterStatus, user?.barberId, user?.clientId, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterDate, filterBarber, filterStatus, pageSize, isClient, isAdmin, isBarber]);

  useEffect(() => {
    const tick = window.setInterval(() => setClock(new Date()), 10_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const editMatch = location.pathname.match(/^\/appointments\/(\d+)\/edit$/);
    if (editMatch) {
      setFormView(parseInt(editMatch[1], 10));
      navigate('/appointments', { replace: true });
      return;
    }
    if (location.pathname === '/appointments/new') {
      setFormView('create');
      navigate(`/appointments${location.search || ''}`, { replace: true });
      return;
    }
    if (location.state?.openCreateForm) {
      setFormView('create');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const handleFormSuccess = ({ created, updated } = {}) => {
    setFormView(null);
    if (created) setSuccessMessage('Cita agendada correctamente.');
    if (updated) setSuccessMessage('Cita actualizada correctamente.');
    fetchAppointments(1);
    setPage(1);
  };

  // Mensaje de éxito al llegar desde alta/edición de cita (state) o al cancelar
  useEffect(() => {
    const st = location.state;
    if (st?.appointmentCreated) {
      setSuccessMessage('Cita agendada correctamente.');
      navigate(location.pathname, { replace: true, state: {} });
    } else if (st?.appointmentUpdated) {
      setSuccessMessage('Cita actualizada correctamente.');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentService.updateAppointment(id, { status: newStatus });
      setCancelTarget(null);
      setCancelling(false);

      if (isClient && newStatus === 'cancelled') {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
        );
        setSuccessMessage('Cita cancelada correctamente.');
        return;
      }

      fetchAppointments();
      if (isAdmin && newStatus === 'confirmed') {
        setSuccessMessage('Cita confirmada.');
      }
      if (isAdmin && newStatus === 'scheduled') {
        setSuccessMessage('Confirmación retirada; cita agendada.');
      }
      if (isAdmin && newStatus === 'cancelled') {
        setSuccessMessage('Cita cancelada.');
      }
    } catch (err) {
      setCancelling(false);
      setError(err?.message || 'Error al actualizar');
    }
  };

  const handleConfirmChange = (id, confirmed) => {
    handleStatusChange(id, confirmed ? 'confirmed' : 'scheduled');
  };

  const handleCancelRequest = (id) => {
    if (window.confirm('¿Cancelar esta cita?')) {
      handleStatusChange(id, 'cancelled');
    }
  };

  const handleCancelClick = (id) => {
    if (isClient) {
      const target = appointments.find((a) => a.id === id) || null;
      setCancelTarget(target);
    } else {
      handleStatusChange(id, 'cancelled');
    }
  };

  const handleClientCancelConfirm = async () => {
    if (!cancelTarget?.id) return;
    setCancelling(true);
    await handleStatusChange(cancelTarget.id, 'cancelled');
  };

  const handleClientPageSizeChange = useCallback((next) => {
    pageSizeManualRef.current = true;
    setPageSize(next);
  }, []);

  useEffect(() => {
    if (!isClient || formView != null) return undefined;
    const el = clientListRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const measure = () => {
      if (pageSizeManualRef.current) return;
      const height = el.clientHeight;
      const width = el.clientWidth;
      if (height < 80 || width < 80) return;
      const cols = clientGridCols(width);
      const rows = Math.max(1, Math.floor(height / CLIENT_CARD_ESTIMATE_PX));
      const fit = Math.max(cols, rows * cols);
      const auto =
        [...CLIENT_PAGE_SIZE_OPTIONS].reverse().find((n) => n <= fit) || CLIENT_PAGE_SIZE_OPTIONS[0];
      setPageSize((prev) => (prev === auto ? prev : auto));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isClient, formView, loading, appointments.length]);

  const formatTime = formatAppointmentClockTime;

  const pageTitle = isClient ? 'Mis citas' : isBarber ? 'Mis citas' : 'Citas';
  const pageSubtitle = isClient
    ? 'Tus citas y reservas'
    : isBarber
    ? 'Tus citas por fecha'
    : 'Gestión de citas por fecha';

  const isCreating = formView === 'create';
  const editingId = typeof formView === 'number' ? formView : null;
  const isFormOpen = isCreating || editingId != null;

  useEffect(() => {
    if (isFormOpen || isClient) return undefined;
    const refresh = window.setInterval(() => fetchAppointments(page), 30_000);
    return () => window.clearInterval(refresh);
  }, [isFormOpen, isClient, page, filterDate, filterBarber, pageSize]);

  useEffect(() => {
    if (!isClient || !isFormOpen) return undefined;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return undefined;
  }, [isClient, isFormOpen]);

  const inlineForm = isFormOpen ? (
    <AppointmentForm
      embedded
      editId={editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => setFormView(null)}
    />
  ) : null;

  const openEditForm = (id) => setFormView(id);

  const dismissSuccessMessage = () => setSuccessMessage(null);
  const successToast = (
    <SuccessToast message={successMessage} onDismiss={dismissSuccessMessage} />
  );

  // ——— Vista cliente: pantalla completa, sin scroll de página ———
  if (isClient) {
    if (isFormOpen) {
      return (
        <div className="flex-1 min-h-0 overflow-y-auto bg-stone-50">
          <div className="container mx-auto max-w-[min(72rem,100%)] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="mb-4">
              <AdminBackNav label="Volver" onClick={() => setFormView(null)} />
            </div>
            {inlineForm}
          </div>
          {successToast}
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-stone-50 overflow-hidden">
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-5 flex-1 min-h-0 flex flex-col">
          <header className="shrink-0 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6">
            <div className="min-w-0">
              <p className="section-label text-gold">Reservas</p>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 font-medium tracking-tight mb-1">
                Mis citas
              </h1>
              <p className="text-stone-500 text-sm sm:text-base max-w-xl">
                Aquí ves todas tus citas. Puedes agendar una nueva cuando quieras.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center shrink-0 px-5 py-2.5 sm:px-6 sm:py-3 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Agendar nueva cita
            </button>
          </header>

          {error && (
            <div className="shrink-0 mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="shrink-0 mb-3">
            <ClientAppointmentsToolbar
              filterStatus={filterStatus}
              onFilterStatusChange={(next) => {
                pageSizeManualRef.current = false;
                setFilterStatus(next);
              }}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handleClientPageSizeChange}
            />
          </div>

          <div
            ref={clientListRef}
            className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden transition-opacity duration-300"
            key={filterStatus}
          >
            {loading ? (
              <div className="py-12 text-center">
                <p className="text-stone-500">Cargando tus citas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-8 sm:p-10 text-center animate-fade-in max-w-lg mx-auto">
                <p className="text-stone-500 mb-5">
                  {filterStatus === 'scheduled'
                    ? 'No tienes citas agendadas.'
                    : filterStatus === 'completed'
                      ? 'No tienes citas completadas.'
                      : 'No tienes citas canceladas.'}
                </p>
                {filterStatus === 'scheduled' && (
                  <button
                    type="button"
                    onClick={() => setFormView('create')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
                  >
                    Agendar mi primera cita
                    <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 content-start h-full md:overflow-hidden">
                {appointments.map((a) => {
                  const noteText = appointmentNotesOf(a);
                  const effectiveStatus = getEffectiveAppointmentStatus(a, clock);
                  const canAct = !['cancelled', 'no_show', 'completed'].includes(a.status);
                  return (
                    <li key={a.id} className="min-w-0 animate-fade-in">
                      <article className="h-full bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden hover:border-stone-300 transition-all duration-300 flex flex-col">
                        <div className="px-4 py-3 sm:px-4 sm:py-3.5 flex flex-col flex-1 min-h-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                STATUS_BADGE_CLASS[effectiveStatus] || 'bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              {STATUS_LABELS[effectiveStatus] || a.status}
                            </span>
                            <time
                              className="text-xs sm:text-sm text-stone-500 tabular-nums shrink-0"
                              dateTime={extractAppointmentDateYmd(a.appointment_date) || undefined}
                            >
                              {formatAppointmentCalendarDate(a.appointment_date)}
                            </time>
                          </div>

                          {canAct && (
                            <div className="flex items-center justify-end gap-2 mb-2">
                              <EditAppointmentButton onClick={() => openEditForm(a.id)} />
                              <CancelAppointmentButton onClick={() => handleCancelClick(a.id)} />
                            </div>
                          )}

                          <p className="font-semibold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2">
                            {a.service_name}
                          </p>
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-stone-600 text-xs sm:text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" strokeWidth={2} aria-hidden />
                              {formatTime(a.start_time)}
                            </span>
                            <span className="text-stone-300" aria-hidden>
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" strokeWidth={2} aria-hidden />
                              <span className="truncate">
                                {a.barber_first_name} {a.barber_last_name}
                              </span>
                            </span>
                          </p>

                          {noteText ? (
                            <AppointmentNoteBlock
                              text={noteText}
                              maxLength={80}
                              className="text-stone-600 text-xs sm:text-sm mt-2 pl-2.5 border-l-2 border-gold/35 line-clamp-2"
                            />
                          ) : null}

                          {a.status === 'completed' && clientRatingOf(a) == null && (
                            <div className="mt-auto pt-2">
                              <ClientAppointmentRatingForm
                                appointmentId={a.id}
                                onSuccess={() => fetchAppointments()}
                              />
                            </div>
                          )}
                          {a.status === 'completed' && clientRatingOf(a) != null && (
                            <div className="mt-auto pt-2 border-t border-stone-100">
                              <p className="text-xs sm:text-sm text-stone-600 inline-flex flex-wrap items-center gap-1">
                                <span>Tu valoración:</span>
                                <RatingStars value={clientRatingOf(a)} sizeClass="w-3.5 h-3.5" />
                              </p>
                              {clientRatingCommentOf(a) ? (
                                <p className="text-xs text-stone-500 mt-1 italic line-clamp-2">
                                  "{clientRatingCommentOf(a)}"
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <CancelAppointmentModal
          appointment={cancelTarget}
          open={Boolean(cancelTarget)}
          onClose={() => {
            if (cancelling) return;
            setCancelTarget(null);
          }}
          onConfirm={handleClientCancelConfirm}
          confirming={cancelling}
        />
        {successToast}
      </div>
    );
  }

  // ——— Vista barbero: solo consulta (listar y ver detalle) ———
  if (isBarber) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label text-gold">Citas</p>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
              {pageTitle}
            </h1>
            <p className="text-stone-500">{pageSubtitle}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
            {error}
          </div>
        )}

        <AppointmentsPagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        {loading ? (
          <div className="py-16 text-center text-stone-500">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-12 text-center">
            <p className="text-stone-500">No hay citas para esta fecha.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {appointments.map((a) => {
              const noteText = appointmentNotesOf(a);
              return (
              <li key={a.id}>
                <article className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border mb-2 ${STATUS_BADGE_CLASS[getEffectiveAppointmentStatus(a, clock)] || 'bg-stone-100 text-stone-700'}`}>
                      {STATUS_LABELS[getEffectiveAppointmentStatus(a, clock)] || a.status}
                    </span>
                    <p className="font-serif text-lg text-stone-900 font-medium">
                      {formatTime(a.start_time)} — {a.service_name}
                    </p>
                    <p className="text-stone-600 text-sm mt-0.5">
                      {a.client_first_name} {a.client_last_name}
                    </p>
                    {noteText ? (
                      <AppointmentNoteBlock
                        text={noteText}
                        maxLength={160}
                        className="text-stone-600 text-sm mt-2 pl-3 border-l-2 border-gold/35 max-w-xl"
                      />
                    ) : null}
                    {a.status === 'completed' && clientRatingOf(a) != null && (
                      <p className="text-sm mt-2 text-amber-700">
                        <span className="font-medium text-stone-600">Valoración del cliente: </span>
                        <span className="tabular-nums inline-flex items-center" title={`${clientRatingOf(a)} de 5 estrellas`} aria-label={`${clientRatingOf(a)} de 5 estrellas`}>
                          <RatingStars value={clientRatingOf(a)} sizeClass="w-4 h-4" />
                        </span>
                        {clientRatingCommentOf(a) ? (
                          <span className="block text-stone-500 font-normal mt-1 italic text-xs">
                            "{clientRatingCommentOf(a)}"
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                </article>
              </li>
            );
            })}
          </ul>
        )}
        {successToast}
      </div>
    );
  }

  // ——— Vista admin ———
  return (
    <div className="page-shell">
      {!isFormOpen && (
        <PageHeader
            filters={
            <AdminFilterRow className="w-full sm:max-w-none">
              <AdminFilterDate
                id="appointments-filter-date"
                label="Fecha"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              <FilterSelect
                label="Barbero"
                value={filterBarber}
                onChange={setFilterBarber}
                ariaLabel="Filtrar por barbero"
                options={[
                  { id: '', label: 'Todos' },
                  ...barbers.map((b) => ({
                    id: String(b.id),
                    label: `${b.first_name} ${b.last_name}`.trim(),
                  })),
                ]}
              />
            </AdminFilterRow>
          }
          actions={
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="btn-admin inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Nueva cita
            </button>
          }
        />
      )}

      {error && !isFormOpen && (
        <div className="alert-error" role="alert">{error}</div>
      )}

      {inlineForm}

      {!isFormOpen && loading ? (
        <DataCard compact>
          <div className="py-10 text-center text-stone-500">Cargando...</div>
        </DataCard>
      ) : !isFormOpen && appointments.length === 0 ? (
        <DataCard compact>
          <div className="py-10 text-center text-stone-500">No hay citas para esta fecha.</div>
        </DataCard>
      ) : !isFormOpen ? (
        <DataCard compact>
          <AppointmentsPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          <Table>
            <TableHead>
              <TableHeader>Hora</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Barbero</TableHeader>
              <TableHeader>Servicio</TableHeader>
              <TableHeader>Nota</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Valoración</TableHeader>
              <TableHeader>Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {appointments.map((a) => {
                const rating = clientRatingOf(a);
                const noteText = appointmentNotesOf(a);
                const effectiveStatus = getEffectiveAppointmentStatus(a, clock);
                const locked = isAppointmentActionsLocked(a, clock);
                return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{formatTime(a.start_time)}</TableCell>
                  <TableCell>
                    {a.client_first_name} {a.client_last_name}
                  </TableCell>
                  <TableCell>
                    {a.barber_first_name} {a.barber_last_name}
                  </TableCell>
                  <TableCell>{a.service_name}</TableCell>
                  <TableCell className="max-w-[220px]">
                    {noteText ? (
                      <AppointmentNoteEllipsis text={noteText} maxLength={72} className="text-sm text-stone-600" />
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AppointmentStatusBadge status={effectiveStatus} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {effectiveStatus === 'completed' && rating != null ? (
                      <span className="text-amber-600 tabular-nums inline-flex items-center" title="Valoración del cliente">
                        <RatingStars value={rating} sizeClass="w-3.5 h-3.5" />
                      </span>
                    ) : effectiveStatus === 'completed' ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    {effectiveStatus === 'completed' ? (
                      !a.has_active_payment ? (
                        <Link
                          to={`/payments/new?appointmentId=${a.id}`}
                          className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark hover:bg-gold/20 transition-colors"
                        >
                          Registrar pago
                        </Link>
                      ) : (
                        <span className="text-xs text-stone-400">Pagada</span>
                      )
                    ) : ['cancelled', 'no_show'].includes(effectiveStatus) ? null : (
                      <AppointmentActionToggles
                        appointmentId={a.id}
                        status={a.status}
                        canConfirm={canConfirmAppointment(a, clock)}
                        canCancel={canCancelAppointment(a, clock)}
                        onEdit={openEditForm}
                        onConfirmChange={handleConfirmChange}
                        onCancelRequest={handleCancelRequest}
                        editDisabled={locked}
                      />
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataCard>
      ) : null}
      {successToast}
    </div>
  );
}
