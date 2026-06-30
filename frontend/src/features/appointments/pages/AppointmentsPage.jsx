/**
 * Listado y calendario de citas
 * Vista cliente: cards y flujo simple. Admin/Barber: tabla y filtros.
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Star, Plus, ArrowRight, Pencil } from 'lucide-react';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as barberService from '@/features/barbers/services/barberService';
import { useAuth } from '@/shared/contexts/AuthContext';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import { AdminPagination } from '@/shared/components/admin/AdminListControls';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import RatingStars from '@/shared/components/admin/RatingStars';
import { AppointmentNoteBlock, AppointmentNoteEllipsis } from '@/shared/components/AppointmentNoteText';
import AppointmentForm from '@/features/appointments/components/AppointmentForm';
import AppointmentActionToggles from '@/features/appointments/components/AppointmentActionToggles';
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

function AppointmentsPagination({ total, page, pageSize, onPageChange, onPageSizeChange, itemLabel = 'citas' }) {
  return (
    <AdminPagination
      idPrefix="appointments"
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      itemLabel={itemLabel}
      showSummary
      layout="bar"
    />
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
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formView, setFormView] = useState(null);
  const [clock, setClock] = useState(() => new Date());

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
  }, [filterDate, filterBarber, user?.barberId, user?.clientId, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterDate, filterBarber, pageSize, isClient, isAdmin, isBarber]);

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
      setCancelConfirmId(null);
      fetchAppointments();
      if (isClient && newStatus === 'cancelled') {
        setSuccessMessage('Cita cancelada correctamente.');
      }
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
      setCancelConfirmId(id);
    } else {
      handleStatusChange(id, 'cancelled');
    }
  };

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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
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

  const formHeaderTitle = isCreating ? 'Nueva cita' : editingId ? 'Editar cita' : pageTitle;
  const formHeaderSubtitle = isCreating
    ? 'Completa los datos para agendar'
    : editingId
    ? 'Modifica los datos de la cita'
    : pageSubtitle;
  const toolbarTitle = isFormOpen ? formHeaderTitle : null;
  const toolbarSubtitle = isFormOpen ? formHeaderSubtitle : null;

  const dismissSuccessMessage = () => setSuccessMessage(null);
  const successToast = (
    <SuccessToast message={successMessage} onDismiss={dismissSuccessMessage} />
  );

  // ——— Vista cliente: diseño premium y sencillo ———
  if (isClient) {
    if (isFormOpen) {
      return (
        <div className="fixed inset-x-0 top-[calc(4rem+2px)] bottom-0 z-20 bg-stone-50 overflow-hidden">
          <div className="container mx-auto h-full max-w-[min(72rem,100%)] px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col min-h-0">
            <div className="shrink-0 mb-3 sm:mb-4">
              <p className="section-label text-gold">Reservas</p>
              <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
                {formHeaderTitle}
              </h1>
              <p className="text-stone-500 text-sm mt-1">{formHeaderSubtitle}</p>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{inlineForm}</div>
          </div>
          {successToast}
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] bg-stone-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-2xl mx-auto">
            <p className="section-label text-gold">Reservas</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight mb-2">
              Mis citas
            </h1>
            <p className="text-stone-500 mb-8">
              Aquí ves todas tus citas. Puedes agendar una nueva cuando quieras.
            </p>

            <button
              type="button"
              onClick={() => setFormView('create')}
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3.5 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors mb-8"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Agendar nueva cita
            </button>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
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
              <div className="py-16 text-center">
                <p className="text-stone-500">Cargando tus citas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-10 sm:p-14 text-center">
                <p className="text-stone-500 mb-6">Aún no tienes citas agendadas.</p>
                <button
                  type="button"
                  onClick={() => setFormView('create')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
                >
                  Agendar mi primera cita
                  <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {appointments.map((a) => {
                  const noteText = appointmentNotesOf(a);
                  return (
                  <li key={a.id}>
                    <article className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden hover:shadow-card-hover hover:border-stone-300 transition-all duration-300">
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE_CLASS[getEffectiveAppointmentStatus(a, clock)] || 'bg-stone-100 text-stone-700'}`}>
                            {STATUS_LABELS[getEffectiveAppointmentStatus(a, clock)] || a.status}
                          </span>
                          <div className="flex flex-col items-end gap-2 shrink-0 text-right">
                            <time
                              className="text-sm text-stone-500"
                              dateTime={extractAppointmentDateYmd(a.appointment_date) || undefined}
                            >
                              {formatAppointmentCalendarDate(a.appointment_date)}
                            </time>
                            {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <EditAppointmentButton onClick={() => openEditForm(a.id)} />
                                {cancelConfirmId === a.id ? (
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    <span className="text-sm text-stone-600">¿Cancelar?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(a.id, 'cancelled')}
                                      className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                      Sí
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCancelConfirmId(null)}
                                      className="text-sm font-medium text-stone-600 hover:text-stone-800 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelClick(a.id)}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
                                  >
                                    Cancelar esta cita
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="font-semibold text-stone-900 text-lg">
                          {a.service_name}
                        </p>
                        <p className="text-stone-600 text-sm mt-1">
                          {formatTime(a.start_time)} · {a.barber_first_name} {a.barber_last_name}
                        </p>
                        {noteText ? (
                          <AppointmentNoteBlock
                            text={noteText}
                            maxLength={160}
                            className="text-stone-600 text-sm mt-3 pl-3 border-l-2 border-gold/35"
                          />
                        ) : null}
                        {a.status === 'completed' && clientRatingOf(a) == null && (
                          <ClientAppointmentRatingForm appointmentId={a.id} onSuccess={fetchAppointments} />
                        )}
                        {a.status === 'completed' && clientRatingOf(a) != null && (
                          <div className="mt-4 pt-4 border-t border-stone-100">
                            <p className="text-sm text-stone-600 inline-flex flex-wrap items-center gap-1">
                              <span>Tu valoración:</span>
                              <RatingStars value={clientRatingOf(a)} sizeClass="w-4 h-4" />
                            </p>
                            {clientRatingCommentOf(a) ? (
                              <p className="text-sm text-stone-500 mt-1 italic">
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
      <PageHeader
        title={toolbarTitle}
        subtitle={toolbarSubtitle}
        filters={
          !isFormOpen ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-stone-500">Fecha</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="input-premium py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-stone-500">Barbero</span>
                <select
                  value={filterBarber}
                  onChange={(e) => setFilterBarber(e.target.value)}
                  className="input-premium py-1.5 text-sm min-w-[10rem]"
                >
                  <option value="">Todos</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.first_name} {b.last_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null
        }
        actions={
          !isFormOpen ? (
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="btn-admin inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Nueva cita
            </button>
          ) : null
        }
      />

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
