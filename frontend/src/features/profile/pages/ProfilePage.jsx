/**
 * Perfil del cliente autenticado (`/profile`).
 *
 * Es el espejo de la ficha que el administrador ve en
 * `features/clients/pages/ClientDetailPage.jsx`: misma tarjeta hero con
 * avatar, distintivos y métricas, misma tarjeta de contacto y la misma línea
 * de tiempo del historial (`shared/components/admin/AppointmentHistoryTimeline`).
 * El objetivo es que los dos perfiles se lean igual y que el estilo viva en un
 * solo sitio, no que cada rol tenga su propia maqueta.
 *
 * Diferencias intencionales respecto a la ficha del admin, porque cambia
 * quién mira:
 * - Los datos salen de endpoints de autoservicio (`/clients/me/loyalty` y
 *   `/appointments`, que el backend ya acota al cliente de la sesión); esta
 *   pantalla nunca pide `/clients/:id`.
 * - Añade «Próximas citas» y el avance de fidelización, que es lo que el
 *   cliente viene a consultar.
 * - No muestra notas internas de la cita ni el documento: son datos de
 *   mostrador.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Calendar,
  CalendarPlus,
  Clock,
  Gift,
  Mail,
  Pencil,
  Phone,
  Scissors,
  User,
} from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as authService from '@/features/auth/services/authService';
import * as clientService from '@/features/clients/services/clientService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import {
  validateClientProfileForm,
  getApiErrorMessage,
  sanitizePhone,
  sanitizePersonName,
} from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';
import {
  formatAppointmentCalendarDate,
  formatAppointmentClockTime,
} from '@/shared/utils/appointmentTime';
import { FieldErrorMessage, FieldHint } from '@/shared/components/FormValidationFields';
import { AdminPagination } from '@/shared/components/admin/AdminListControls';
import AppointmentHistoryTimeline from '@/shared/components/admin/AppointmentHistoryTimeline';
import ProfileCard from '@/shared/components/admin/ProfileCard';
import LoyaltyProgressTracker from '@/features/loyalty/components/LoyaltyProgressTracker';

function safeDate(value) {
  return formatDisplayDate(value, { year: 'numeric', month: 'long', day: 'numeric' });
}

const FIELD_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-900 placeholder-stone-400 ' +
  'bg-stone-50/90 border border-stone-200/90 focus:bg-white focus:border-gold/50 ' +
  'focus:ring-2 focus:ring-gold/20 outline-none transition-all min-h-[42px]';

const HISTORY_PAGE_SIZE_OPTIONS = [5, 10, 20];
const HISTORY_DEFAULT_PAGE_SIZE = 5;
/** Cuántas citas próximas se listan en la tarjeta; el resto está en «Mis citas». */
const UPCOMING_VISIBLE = 3;

/** Fila de dato de contacto, con el mismo tratamiento que en la ficha del admin. */
function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-stone-50 p-3 transition-all duration-200 hover:border-stone-100 hover:bg-stone-50/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50/60 text-gold-dark transition-colors group-hover:bg-gold/10">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">{label}</span>
        {children}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, applyUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const { fieldError, applyValidation, clearFieldError, markTouched, clearValidation, fieldBorderClass } =
    useFormValidation();

  // --- Fidelización propia ---
  const [loyalty, setLoyalty] = useState(null);

  // --- Citas ---
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(HISTORY_DEFAULT_PAGE_SIZE);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
    });
  }, [user]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  /**
   * Fidelización y próximas citas: una sola carga al entrar. Un fallo aquí no
   * bloquea el perfil —los datos de la cuenta ya vienen de `AuthContext`— así
   * que se degrada a "sin datos" en vez de romper la pantalla.
   */
  useEffect(() => {
    let cancelled = false;

    clientService
      .getMyLoyalty()
      .then((data) => {
        if (!cancelled) setLoyalty(data);
      })
      .catch(() => {
        if (!cancelled) setLoyalty(null);
      });

    appointmentService
      .getAppointments({ status: 'scheduled,confirmed', limit: 20 })
      .then(({ appointments }) => {
        if (cancelled) return;
        // El listado llega de la más reciente a la más antigua; para "próximas"
        // interesa el orden inverso: la que toca primero, arriba.
        const ordered = [...appointments].sort((a, b) => {
          const byDate = String(a.appointment_date).localeCompare(String(b.appointment_date));
          return byDate !== 0 ? byDate : String(a.start_time).localeCompare(String(b.start_time));
        });
        setUpcoming(ordered);
      })
      .catch(() => {
        if (!cancelled) setUpcoming([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    appointmentService
      .getAppointments({
        limit: historyPageSize,
        offset: (historyPage - 1) * historyPageSize,
      })
      .then(({ appointments, total }) => {
        if (cancelled) return;
        setHistory(appointments);
        setHistoryTotal(total);
        const totalPages = Math.max(1, Math.ceil(total / historyPageSize) || 1);
        if (historyPage > totalPages) setHistoryPage(totalPages);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory([]);
        setHistoryTotal(0);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyPage, historyPageSize]);

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Cliente',
    [user?.firstName, user?.lastName],
  );
  const initials = useMemo(() => {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';
    return (first + last).toUpperCase() || fullName.charAt(0).toUpperCase() || '?';
  }, [user?.firstName, user?.lastName, fullName]);

  // Las métricas salen del progreso de fidelización, que el backend calcula
  // sobre TODAS las citas del cliente — no sobre la página del historial que
  // se esté viendo. Mientras no llegue, se muestra el total del historial.
  const completedAppointments = loyalty?.progress?.completedCount ?? null;
  const totalAppointments = loyalty?.progress?.scheduledCount ?? historyTotal;
  const isFrequent = (completedAppointments ?? 0) >= 3;
  const pendingRedeem = loyalty?.pendingRedeem ?? [];
  const pendingChoice = loyalty?.pendingChoice ?? [];
  const nextMilestone = loyalty?.progress?.nextMilestone ?? null;

  const handleHistoryPageSize = useCallback((size) => {
    setHistoryPageSize(size);
    setHistoryPage(1);
  }, []);

  const startEdit = () => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    clearValidation();
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
    clearValidation();
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'firstName' || name === 'lastName') next = sanitizePersonName(value);
    if (name === 'phone') next = sanitizePhone(value);
    setForm((prev) => ({ ...prev, [name]: next }));
    clearFieldError(name);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateClientProfileForm(form);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await authService.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      });
      applyUser(updated);
      setEditing(false);
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el perfil.'));
    } finally {
      setSaving(false);
    }
  };

  const hintOrError = (name, value, okHint) => {
    const err = fieldError(name);
    if (err) return <FieldErrorMessage>{err}</FieldErrorMessage>;
    if (value) return <FieldHint>{okHint}</FieldHint>;
    return null;
  };

  return (
    <div className="min-h-[70vh] bg-stone-50">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl animate-fade-in-up space-y-4">
          {/* Tarjeta hero — mismo tratamiento que la ficha del administrador */}
          <div className="relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover md:p-6">
            <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 bg-gradient-radial-gold opacity-60" />

            <div className="relative flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
              <div className="flex w-full flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="group relative shrink-0">
                  <div className="flex h-20 w-20 select-none items-center justify-center rounded-full border-2 border-gold/45 bg-gradient-to-tr from-stone-950 via-stone-900 to-stone-850 font-serif text-3xl font-bold text-gold shadow-md transition-all duration-350 group-hover:scale-105 group-hover:border-gold sm:h-24 sm:w-24">
                    {initials}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-stone-950 text-xs font-bold text-gold">
                    ★
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="section-label text-gold">Mi cuenta</p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                      <h1 className="break-words font-sans text-2xl font-bold tracking-tight text-stone-900">
                        {fullName}
                      </h1>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isFrequent
                            ? 'border border-gold/30 bg-gold/10 text-gold-dark'
                            : 'border border-stone-200/50 bg-stone-100 text-stone-600'
                        }`}
                      >
                        {isFrequent ? (
                          <>
                            <Award className="h-3 w-3 shrink-0 text-gold-dark" aria-hidden />
                            Cliente Frecuente
                          </>
                        ) : (
                          'Cliente Registrado'
                        )}
                      </span>
                      {pendingRedeem.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <Gift className="h-3 w-3 shrink-0" aria-hidden />
                          Premio listo para tu próxima visita
                        </span>
                      )}
                      {pendingChoice.length > 0 && (
                        <Link
                          to="/loyalty"
                          className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold-dark transition-colors hover:bg-gold/20"
                        >
                          <Award className="h-3 w-3 shrink-0" aria-hidden />
                          Tienes un premio por elegir
                        </Link>
                      )}
                    </div>
                    {/* El avance detallado no se repite aquí: vive en la
                        tarjeta «Fidelización», con su indicador de progreso. */}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 sm:flex sm:items-center">
                    <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-2 text-center transition-colors hover:bg-stone-100/50 sm:text-left">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
                        <Scissors className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                          Citas totales
                        </span>
                        <span className="text-sm font-extrabold text-stone-850">{totalAppointments}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-2 text-center transition-colors hover:bg-stone-100/50 sm:text-left">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <Award className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                          Completadas
                        </span>
                        <span className="text-sm font-extrabold text-stone-850">
                          {completedAppointments ?? '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-2 text-center transition-colors hover:bg-stone-100/50 sm:text-left">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Calendar className="h-4 w-4" aria-hidden />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                          Agendadas
                        </span>
                        <span className="text-sm font-extrabold text-stone-850">{upcoming.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row md:ml-3 md:mt-1 md:w-auto md:self-start">
                {!editing && (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-gold shadow-sm transition-all duration-300 hover:border-gold/45 hover:bg-stone-800 hover:text-gold-light active:scale-95 sm:w-auto"
                  >
                    <Pencil className="h-4 w-4 transition-transform group-hover:rotate-12" aria-hidden />
                    Editar perfil
                  </button>
                )}
              </div>
            </div>
          </div>

          {success && !editing && (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              {success}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-5">
            {/* Columna de datos (2/5) */}
            <div className="space-y-4 md:col-span-2">
              <ProfileCard title="Información de contacto" hint="Datos generales">
                {editing ? (
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {error && (
                      <div
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}

                    <div className="grid gap-4">
                      <div>
                        <label htmlFor="profile-firstName" className="mb-1.5 block text-xs tracking-wider text-stone-500">
                          Nombre *
                        </label>
                        <input
                          id="profile-firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          onBlur={() => markTouched('firstName')}
                          className={`${FIELD_CLASS} ${fieldBorderClass('firstName', !fieldError('firstName'), form.firstName)}`}
                          autoComplete="given-name"
                        />
                        {hintOrError('firstName', form.firstName, 'Nombre listo.')}
                      </div>
                      <div>
                        <label htmlFor="profile-lastName" className="mb-1.5 block text-xs tracking-wider text-stone-500">
                          Apellido *
                        </label>
                        <input
                          id="profile-lastName"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                          onBlur={() => markTouched('lastName')}
                          className={`${FIELD_CLASS} ${fieldBorderClass('lastName', !fieldError('lastName'), form.lastName)}`}
                          autoComplete="family-name"
                        />
                        {hintOrError('lastName', form.lastName, 'Apellido listo.')}
                      </div>
                      <div>
                        <label htmlFor="profile-email" className="mb-1.5 block text-xs tracking-wider text-stone-500">
                          Correo *
                        </label>
                        <input
                          id="profile-email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          onBlur={() => markTouched('email')}
                          className={`${FIELD_CLASS} ${fieldBorderClass('email', !fieldError('email'), form.email)}`}
                          autoComplete="email"
                        />
                        {hintOrError('email', form.email, 'Correo listo.')}
                      </div>
                      <div>
                        <label htmlFor="profile-phone" className="mb-1.5 block text-xs tracking-wider text-stone-500">
                          Teléfono
                        </label>
                        <input
                          id="profile-phone"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          onBlur={() => markTouched('phone')}
                          className={`${FIELD_CLASS} ${fieldBorderClass('phone', !fieldError('phone'), form.phone)}`}
                          autoComplete="tel"
                          placeholder="Opcional"
                        />
                        {hintOrError('phone', form.phone, 'Teléfono listo.')}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button type="submit" disabled={saving} className="btn-dark disabled:opacity-60">
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={saving} className="btn-outline">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <ContactRow icon={Mail} label="Correo electrónico">
                      {user?.email ? (
                        <a
                          href={`mailto:${user.email}`}
                          className="block truncate text-sm font-semibold text-stone-800 transition-colors hover:text-gold-dark"
                        >
                          {user.email}
                        </a>
                      ) : (
                        <span className="block text-sm font-medium italic text-stone-400">
                          Sin correo registrado
                        </span>
                      )}
                    </ContactRow>

                    <ContactRow icon={Phone} label="Teléfono">
                      {user?.phone ? (
                        <a
                          href={`tel:${user.phone}`}
                          className="block truncate text-sm font-semibold text-stone-800 transition-colors hover:text-gold-dark"
                        >
                          {user.phone}
                        </a>
                      ) : (
                        <span className="block text-sm font-medium italic text-stone-400">
                          Sin teléfono registrado
                        </span>
                      )}
                    </ContactRow>

                    <ContactRow icon={User} label="Tipo de cuenta">
                      <span className="block text-sm font-semibold capitalize text-stone-800">
                        {user?.role === 'client' ? 'Cliente' : user?.role || '—'}
                      </span>
                    </ContactRow>

                    <ContactRow icon={Calendar} label="Miembro desde">
                      <span className="block text-sm font-semibold text-stone-800">
                        {safeDate(user?.createdAt)}
                      </span>
                    </ContactRow>

                    <p className="pt-1 text-xs text-stone-500">
                      Para cambiar la contraseña usa «¿Olvidaste tu contraseña?» en el inicio de sesión.
                    </p>
                  </div>
                )}
              </ProfileCard>

              <ProfileCard title="Fidelización" hint="Tus premios">
                {nextMilestone ? (
                  <LoyaltyProgressTracker
                    everyCount={nextMilestone.everyCount}
                    remaining={nextMilestone.remaining}
                    label={nextMilestone.label}
                    personal
                  />
                ) : (
                  <p className="text-sm text-stone-500">
                    {loyalty
                      ? 'Todavía no hay hitos de fidelización configurados. Vuelve pronto.'
                      : 'No pudimos cargar tu fidelización en este momento.'}
                  </p>
                )}

                {pendingRedeem.length > 0 && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                      <Gift className="h-4 w-4" aria-hidden /> Listo para tu próxima visita
                    </p>
                    <ul className="space-y-1">
                      {pendingRedeem.map((reward) => (
                        <li key={reward.id} className="text-xs text-emerald-900">
                          {reward.items.map((it) => it.description).join(' + ')} — se aplica solo en tu
                          próximo cobro.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  to="/loyalty"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-dark hover:underline"
                >
                  Ver mi fidelización completa <span aria-hidden>→</span>
                </Link>
              </ProfileCard>
            </div>

            {/* Columna de citas (3/5) */}
            <div className="space-y-4 md:col-span-3">
              <ProfileCard title="Citas agendadas" hint="Próximas visitas">
                {upcoming.length === 0 ? (
                  <div className="py-6 text-center">
                    <Calendar className="mx-auto mb-2 h-10 w-10 text-stone-200" aria-hidden />
                    <p className="mb-4 text-sm font-medium text-stone-500">No tienes citas agendadas.</p>
                    <Link to="/appointments/new" className="btn-dark inline-flex items-center gap-2">
                      <CalendarPlus className="h-4 w-4" aria-hidden />
                      Agendar cita
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-2.5">
                      {upcoming.slice(0, UPCOMING_VISIBLE).map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900">
                              {item.service_name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                                {formatAppointmentCalendarDate(item.appointment_date, 'es-CO', {
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                                {formatAppointmentClockTime(item.start_time)}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                                {item.barber_first_name} {item.barber_last_name}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full border border-amber-200/50 bg-amber-50/70 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            {item.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {upcoming.length > UPCOMING_VISIBLE ? (
                        <Link
                          to="/appointments"
                          state={{ view: 'list' }}
                          className="text-sm font-semibold text-gold-dark hover:underline"
                        >
                          Ver las {upcoming.length} citas agendadas →
                        </Link>
                      ) : (
                        <span />
                      )}
                      <Link
                        to="/appointments/new"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-gold-dark"
                      >
                        <CalendarPlus className="h-4 w-4" aria-hidden />
                        Agendar otra
                      </Link>
                    </div>
                  </>
                )}
              </ProfileCard>

              <ProfileCard title="Historial de servicios" hint="Servicios recibidos">
                <AdminPagination
                  idPrefix="profile-history"
                  page={historyPage}
                  pageSize={historyPageSize}
                  total={historyTotal}
                  onPageChange={setHistoryPage}
                  onPageSizeChange={handleHistoryPageSize}
                  pageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
                  itemLabel={`cita${historyTotal !== 1 ? 's' : ''}`}
                  showSummary
                  layout="bar"
                  disabled={historyLoading}
                  className="mb-4"
                />

                {/* Sin notas: la nota de la cita es de uso interno del mostrador. */}
                <AppointmentHistoryTimeline
                  appointments={history}
                  loading={historyLoading}
                  total={historyTotal}
                  showNotes={false}
                  emptyLabel="Todavía no tienes citas registradas."
                  loadingLabel="Cargando tus citas..."
                />
              </ProfileCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
