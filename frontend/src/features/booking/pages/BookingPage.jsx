import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import * as bookingService from '@/features/booking/services/publicBookingService';
import {
  sanitizePhone,
  sanitizePersonName,
  validateBookingForm,
  getApiErrorMessage,
  CLIENT_NAME_MAX,
  CLIENT_NOTES_MAX,
  CLIENT_PHONE_MAX_DIGITS,
} from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { PublicFormField, FieldErrorMessage } from '@/shared/components/FormValidationFields';
import CustomSelect, { formSelectEvent } from '@/shared/components/CustomSelect';
import { getLocalDateToday } from '@/shared/utils/appointmentTime';
import {
  APPOINTMENT_HORIZON_DAYS_PUBLIC,
  getAppointmentDateBounds,
} from '@/shared/utils/dateRange';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import { formatMoney } from '@/shared/utils/money';
import { useAuth } from '@/shared/contexts/AuthContext';

const MAX_SERVICES = 3;
const MAX_SERVICES_MESSAGE = 'Para agendar más servicios debes crear otra cita.';

const SERVICE_SEARCH_CLASS =
  'w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm text-stone-900 placeholder-stone-400 transition-all duration-200 min-h-[42px] ' +
  'bg-white border border-gold/45 focus:border-gold/60 focus:ring-2 focus:ring-gold/20 outline-none';

export default function BookingPage() {
  const { isAuthenticated } = useAuth();
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');

  const [form, setForm] = useState({
    serviceIds: [],
    barberId: '',
    appointmentDate: getLocalDateToday(),
    startTime: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('');
  const bookingDateBounds = getAppointmentDateBounds({
    horizonDays: APPOINTMENT_HORIZON_DAYS_PUBLIC,
  });
  const [servicesOpen, setServicesOpen] = useState(false);
  const [maxServicesHint, setMaxServicesHint] = useState(false);
  const servicePickerRef = useRef(null);
  const serviceSearchRef = useRef(null);
  const { fieldError, inputInvalidClass, applyValidation, clearFieldError } = useFormValidation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, s] = await Promise.all([
          bookingService.getBarbers(),
          bookingService.getServices(),
        ]);
        if (cancelled) return;
        setBarbers(Array.isArray(b) ? b : []);
        setServices(Array.isArray(s) ? s : []);
      } catch (err) {
        if (!cancelled) {
          setCatalogueError(
            getApiErrorMessage(err, 'No se pudo cargar la información de agendamiento.'),
          );
        }
      } finally {
        if (!cancelled) setLoadingCatalogue(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!servicesOpen) return undefined;
    const onPointerDown = (event) => {
      if (!servicePickerRef.current?.contains(event.target)) {
        setServicesOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setServicesOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [servicesOpen]);

  useEffect(() => {
    if (!maxServicesHint) return undefined;
    const timer = window.setTimeout(() => setMaxServicesHint(false), 4000);
    return () => window.clearTimeout(timer);
  }, [maxServicesHint]);

  const atMaxServices = form.serviceIds.length >= MAX_SERVICES;

  const selectedServices = useMemo(
    () =>
      form.serviceIds
        .map((id) => services.find((s) => String(s.id) === String(id)))
        .filter(Boolean),
    [services, form.serviceIds],
  );

  const totalDuration = useMemo(
    () =>
      selectedServices.reduce(
        (sum, s) => sum + Number(s.duration_minutes || s.durationMinutes || 0),
        0,
      ),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0),
    [selectedServices],
  );

  const filteredServices = useMemo(() => {
    const q = serviceFilter.trim().toLowerCase();
    return services.filter((s) => {
      if (form.serviceIds.includes(String(s.id))) return false;
      if (!q) return true;
      const name = String(s.name || '').toLowerCase();
      const category = String(s.category_name || s.categoryName || '').toLowerCase();
      return name.includes(q) || category.includes(q);
    });
  }, [services, serviceFilter, form.serviceIds]);

  useEffect(() => {
    setSlots([]);
    setForm((f) => ({ ...f, startTime: '' }));
    setSlotsError('');
    if (!form.barberId || !form.appointmentDate || form.serviceIds.length === 0) return;
    let cancelled = false;
    setSlotsLoading(true);
    bookingService
      .getSlots({
        barberId: form.barberId,
        date: form.appointmentDate,
        durationMinutes: totalDuration > 0 ? totalDuration : undefined,
      })
      .then((data) => {
        if (!cancelled) setSlots(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setSlotsError(err?.message || 'No se pudieron cargar las horas.');
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.barberId, form.appointmentDate, form.serviceIds, totalDuration]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => String(b.id) === String(form.barberId)) || null,
    [barbers, form.barberId],
  );

  const addService = (serviceId) => {
    const sid = String(serviceId);
    setForm((prev) => {
      if (prev.serviceIds.includes(sid) || prev.serviceIds.length >= MAX_SERVICES) return prev;
      const nextIds = [...prev.serviceIds, sid];
      if (nextIds.length >= MAX_SERVICES) {
        window.setTimeout(() => setMaxServicesHint(true), 0);
      }
      window.setTimeout(() => setServicesOpen(nextIds.length < MAX_SERVICES), 0);
      return { ...prev, serviceIds: nextIds, startTime: '' };
    });
    clearFieldError('serviceIds');
    setError('');
    setServiceFilter('');
  };

  const openServicePicker = () => {
    if (loadingCatalogue) return;
    if (atMaxServices) {
      setMaxServicesHint(true);
      return;
    }
    setServicesOpen(true);
    window.setTimeout(() => serviceSearchRef.current?.focus(), 0);
  };

  const removeService = (serviceId) => {
    const sid = String(serviceId);
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.filter((id) => id !== sid),
      startTime: '',
    }));
    clearFieldError('serviceIds');
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'phone') next = sanitizePhone(value);
    else if (name === 'firstName' || name === 'lastName') next = sanitizePersonName(value);
    else if (name === 'notes' && value.length > CLIENT_NOTES_MAX) return;
    else if (name === 'appointmentDate' && value) {
      if (value < bookingDateBounds.min) next = bookingDateBounds.min;
      else if (value > bookingDateBounds.max) next = bookingDateBounds.max;
    }
    setForm((prev) => ({ ...prev, [name]: next }));
    setError('');
    clearFieldError(name);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const validation = validateBookingForm(form);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }
    setSubmitting(true);
    try {
      const result = await bookingService.createBooking({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        barberId: Number(form.barberId),
        serviceIds: form.serviceIds.map((id) => Number(id)),
        serviceId: Number(form.serviceIds[0]),
        appointmentDate: form.appointmentDate,
        startTime: form.startTime,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos registrar la cita.'));
    } finally {
      setSubmitting(false);
    }
  };

  const timePlaceholder = !form.serviceIds.length
    ? 'Agrega un servicio'
    : !form.barberId
      ? 'Elige barbero primero'
      : !form.appointmentDate
        ? 'Elige fecha primero'
        : slotsLoading
          ? 'Cargando…'
          : slots.length === 0
            ? 'Sin horarios'
            : 'Seleccionar...';

  if (!isAuthenticated) {
    return <Navigate to="/register?redirect=/appointments/new" replace />;
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full panel-card overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
          <div className="p-8 sm:p-10 text-center">
            <p className="text-gold tracking-[0.2em] text-xs font-semibold mb-2">¡Listo!</p>
            <h1 className="font-serif text-3xl text-stone-900 font-medium mb-3">Cita registrada</h1>
            <p className="text-stone-600 text-sm mb-6">
              Enviamos la confirmación a <strong>{form.email}</strong>. Si no la ves en unos
              minutos, revisa la carpeta de spam.
            </p>
            <div className="text-left bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Servicio:</span> {success.service_name}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Barbero:</span>{' '}
                {`${success.barber_first_name || ''} ${success.barber_last_name || ''}`.trim()}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Fecha:</span> {form.appointmentDate}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Hora:</span> {form.startTime}
              </p>
            </div>
            <Link
              to="/"
              className="btn-dark py-2.5 px-5 text-sm inline-flex items-center justify-center"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <p className="text-gold tracking-[0.3em] text-xs font-semibold mb-3">Reserva en línea</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-3">
            Agenda tu cita
          </h1>
          <p className="text-stone-500 text-sm max-w-lg mx-auto">
            Elige hasta {MAX_SERVICES} servicios, barbero y horario. Te confirmamos por correo al
            instante.
          </p>
        </div>

        <div className="panel-card overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
          <form onSubmit={onSubmit} noValidate className="p-6 sm:p-10 space-y-6">
            {catalogueError && (
              <div className="alert-error" role="alert">
                {catalogueError}
              </div>
            )}
            {error && (
              <div className="alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-start">
                <div className="group" ref={servicePickerRef}>
                  <label className="label-premium" htmlFor="booking-service-filter">
                    Servicios *
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                      aria-hidden
                    />
                    <input
                      ref={serviceSearchRef}
                      id="booking-service-filter"
                      type="search"
                      value={serviceFilter}
                      onChange={(e) => {
                        setServiceFilter(e.target.value);
                        if (!servicesOpen && !atMaxServices) setServicesOpen(true);
                      }}
                      onFocus={openServicePicker}
                      onClick={openServicePicker}
                      placeholder="Buscar servicio por nombre o categoría…"
                      className={`${SERVICE_SEARCH_CLASS} ${
                        fieldError('serviceIds') ? inputInvalidClass : ''
                      }`}
                      autoComplete="off"
                      disabled={loadingCatalogue || atMaxServices}
                      aria-expanded={servicesOpen}
                      aria-controls="booking-service-list"
                      aria-invalid={Boolean(fieldError('serviceIds')) || undefined}
                    />
                  </div>

                  {servicesOpen && !atMaxServices && (
                    <ul
                      id="booking-service-list"
                      className="mt-2 rounded-xl border border-stone-200/90 bg-white divide-y divide-stone-100 max-h-44 overflow-y-auto shadow-sm"
                      role="listbox"
                      aria-label="Servicios disponibles"
                    >
                      {loadingCatalogue ? (
                        <li className="px-3 py-2.5 text-sm text-stone-500">Cargando servicios…</li>
                      ) : filteredServices.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-stone-500">
                          {serviceFilter.trim()
                            ? 'No hay servicios con ese nombre o categoría.'
                            : form.serviceIds.length > 0
                              ? 'Ya agregaste todos los servicios disponibles.'
                              : 'No hay servicios para agregar.'}
                        </li>
                      ) : (
                        filteredServices.map((s) => (
                          <li key={s.id} role="option">
                            <button
                              type="button"
                              onClick={() => addService(s.id)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors"
                            >
                              <span className="min-w-0">
                                <span className="font-medium text-stone-900 block truncate">
                                  {s.name}
                                </span>
                                {(s.category_name || s.categoryName) && (
                                  <span className="text-xs text-stone-400 truncate block">
                                    {s.category_name || s.categoryName}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-xs text-stone-500 tabular-nums text-right">
                                {formatMoney(s.price)}
                                <span className="block">
                                  {s.duration_minutes || s.durationMinutes} min
                                </span>
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}

                  <FieldErrorMessage message={fieldError('serviceIds')} />
                </div>

                <PublicFormField label="Barbero" htmlFor="barberId" required error={fieldError('barberId')}>
                  {({ invalid, errorId }) => (
                    <CustomSelect
                      id="barberId"
                      name="barberId"
                      value={form.barberId}
                      onChange={formSelectEvent('barberId', onChange)}
                      placeholder="Selecciona un barbero…"
                      variant="public"
                      selectClassName={invalid ? inputInvalidClass : ''}
                      disabled={loadingCatalogue}
                      ariaInvalid={invalid || undefined}
                      ariaDescribedBy={errorId}
                      options={barbers.map((b) => ({
                        id: String(b.id),
                        label: `${b.first_name} ${b.last_name}`.trim(),
                      }))}
                    />
                  )}
                </PublicFormField>
              </div>

              {selectedServices.length > 0 && (
                <div className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                  {selectedServices.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-800"
                    >
                      <span className="font-medium whitespace-nowrap">{s.name}</span>
                      <span className="text-stone-400 tabular-nums text-xs whitespace-nowrap">
                        {s.duration_minutes || s.durationMinutes} min
                      </span>
                      <button
                        type="button"
                        onClick={() => removeService(s.id)}
                        className="text-stone-400 hover:text-red-600 transition-colors"
                        aria-label={`Quitar ${s.name}`}
                      >
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {maxServicesHint && (
                <AppInlineAlert variant="warning" className="text-xs py-2 px-3">
                  {MAX_SERVICES_MESSAGE}
                </AppInlineAlert>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PublicFormField
                label="Fecha"
                htmlFor="appointmentDate"
                required
                error={fieldError('appointmentDate')}
              >
                {({ invalid, errorId }) => (
                  <input
                    id="appointmentDate"
                    name="appointmentDate"
                    type="date"
                    min={bookingDateBounds.min}
                    max={bookingDateBounds.max}
                    value={form.appointmentDate}
                    onChange={onChange}
                    className={`input-premium ${invalid ? inputInvalidClass : ''}`}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>

              <PublicFormField label="Hora" htmlFor="startTime" required error={fieldError('startTime')}>
                {({ invalid, errorId }) => (
                  <CustomSelect
                    id="startTime"
                    name="startTime"
                    value={form.startTime}
                    onChange={formSelectEvent('startTime', onChange)}
                    placeholder={timePlaceholder}
                    variant="public"
                    selectClassName={invalid ? inputInvalidClass : ''}
                    disabled={
                      !form.serviceIds.length ||
                      !form.barberId ||
                      !form.appointmentDate ||
                      slotsLoading ||
                      slots.length === 0
                    }
                    ariaInvalid={invalid || undefined}
                    ariaDescribedBy={errorId}
                    options={slots.map((slot) => ({ id: slot, label: slot }))}
                  />
                )}
              </PublicFormField>
            </div>

            {slotsError && <p className="text-sm text-red-600 -mt-2">{slotsError}</p>}

            <hr className="border-stone-200" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PublicFormField label="Nombre" htmlFor="firstName" required error={fieldError('firstName')}>
                {({ invalid, errorId }) => (
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={onChange}
                    className={`input-premium ${invalid ? inputInvalidClass : ''}`}
                    maxLength={CLIENT_NAME_MAX}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>
              <PublicFormField label="Apellido" htmlFor="lastName" required error={fieldError('lastName')}>
                {({ invalid, errorId }) => (
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={onChange}
                    className={`input-premium ${invalid ? inputInvalidClass : ''}`}
                    maxLength={CLIENT_NAME_MAX}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>
              <PublicFormField label="Correo" htmlFor="email" required error={fieldError('email')}>
                {({ invalid, errorId }) => (
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    className={`input-premium ${invalid ? inputInvalidClass : ''}`}
                    placeholder="tu@email.com"
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>
              <PublicFormField label="Teléfono" htmlFor="phone" error={fieldError('phone')}>
                {({ invalid, errorId }) => (
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={onChange}
                    className={`input-premium ${invalid ? inputInvalidClass : ''}`}
                    placeholder="Solo números"
                    maxLength={CLIENT_PHONE_MAX_DIGITS}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <label className="label-premium mb-0" htmlFor="notes">
                  Notas
                </label>
                <span className="text-[10px] text-stone-400 tabular-nums">
                  {form.notes.length}/{CLIENT_NOTES_MAX}
                </span>
              </div>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={onChange}
                className={`input-premium resize-none ${
                  fieldError('notes') ? inputInvalidClass : ''
                }`}
                rows={3}
                maxLength={CLIENT_NOTES_MAX}
                placeholder="Algo que el barbero deba saber (opcional)"
              />
              <FieldErrorMessage message={fieldError('notes')} />
            </div>

            {(selectedServices.length > 0 || selectedBarber) && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-600">
                <p className="text-stone-900 font-semibold mb-1">Resumen</p>
                {selectedServices.length > 0 && (
                  <p>
                    {selectedServices.map((s) => s.name).join(', ')} — {formatMoney(totalPrice)}
                    {totalDuration > 0 ? ` · ${totalDuration} min` : ''}
                  </p>
                )}
                {selectedBarber && (
                  <p>
                    Con {selectedBarber.first_name} {selectedBarber.last_name}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loadingCatalogue}
              className="btn-dark w-full py-3 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Reservando…' : 'Confirmar cita'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
