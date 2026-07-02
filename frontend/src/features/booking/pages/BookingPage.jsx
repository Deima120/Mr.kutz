import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as bookingService from '@/features/booking/services/publicBookingService';
import { sanitizePhone, validateBookingForm, getApiErrorMessage } from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { PublicFormField, FieldErrorMessage } from '@/shared/components/FormValidationFields';
import CustomSelect, { formSelectEvent } from '@/shared/components/CustomSelect';
import { getLocalDateToday } from '@/shared/utils/appointmentTime';

function formatPrice(v) {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n);
  } catch (_) {
    return `$${n}`;
  }
}

export default function BookingPage() {
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');

  const [form, setForm] = useState({
    serviceId: '',
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
        setBarbers(b);
        setServices(s);
      } catch (err) {
        if (!cancelled) {
          setCatalogueError(
            err?.message || 'No se pudo cargar la información de agendamiento.'
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

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(form.serviceId)) || null,
    [services, form.serviceId]
  );

  useEffect(() => {
    setSlots([]);
    setForm((f) => ({ ...f, startTime: '' }));
    setSlotsError('');
    if (!form.barberId || !form.appointmentDate) return;
    const durationMinutes = selectedService
      ? Number(selectedService.duration_minutes || selectedService.durationMinutes || 0)
      : 0;
    let cancelled = false;
    setSlotsLoading(true);
    bookingService
      .getSlots({
        barberId: form.barberId,
        date: form.appointmentDate,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
      })
      .then((data) => {
        if (!cancelled) setSlots(data);
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
  }, [form.barberId, form.appointmentDate, form.serviceId, selectedService]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => String(b.id) === String(form.barberId)) || null,
    [barbers, form.barberId]
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    const next = name === 'phone' ? sanitizePhone(value) : value;
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
        serviceId: Number(form.serviceId),
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

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full panel-card overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
          <div className="p-8 sm:p-10 text-center">
            <p className="text-gold tracking-[0.2em] text-xs font-semibold mb-2">
              ¡Listo!
            </p>
            <h1 className="font-serif text-3xl text-stone-900 font-medium mb-3">
              Cita registrada
            </h1>
            <p className="text-stone-600 text-sm mb-6">
              Enviamos la confirmación a <strong>{form.email}</strong>. Si no la
              ves en unos minutos, revisa la carpeta de spam.
            </p>
            <div className="text-left bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Servicio:</span>{' '}
                {success.service_name}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Barbero:</span>{' '}
                {`${success.barber_first_name || ''} ${success.barber_last_name || ''}`.trim()}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Fecha:</span>{' '}
                {form.appointmentDate}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Hora:</span> {form.startTime}
              </p>
            </div>
            <Link to="/" className="btn-dark py-2.5 px-5 text-sm inline-flex items-center justify-center">
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
          <p className="text-gold tracking-[0.3em] text-xs font-semibold mb-3">
            Reserva en línea
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-3">
            Agenda tu cita
          </h1>
          <p className="text-stone-500 text-sm max-w-lg mx-auto">
            Elige el servicio, barbero y horario. Te confirmamos por correo al
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PublicFormField label="Servicio" htmlFor="serviceId" required error={fieldError('serviceId')}>
                {({ invalid, errorId }) => (
                  <CustomSelect
                    id="serviceId"
                    name="serviceId"
                    value={form.serviceId}
                    onChange={formSelectEvent('serviceId', onChange)}
                    placeholder="Selecciona un servicio…"
                    variant="public"
                    selectClassName={invalid ? inputInvalidClass('serviceId') : ''}
                    disabled={loadingCatalogue}
                    ariaInvalid={invalid || undefined}
                    ariaDescribedBy={errorId}
                    options={services.map((s) => ({
                      id: String(s.id),
                      label: `${s.name} — ${formatPrice(s.price)} (${s.duration_minutes} min)`,
                    }))}
                  />
                )}
              </PublicFormField>

              <PublicFormField label="Barbero" htmlFor="barberId" required error={fieldError('barberId')}>
                {({ invalid, errorId }) => (
                  <CustomSelect
                    id="barberId"
                    name="barberId"
                    value={form.barberId}
                    onChange={formSelectEvent('barberId', onChange)}
                    placeholder="Selecciona un barbero…"
                    variant="public"
                    selectClassName={invalid ? inputInvalidClass('barberId') : ''}
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

            <PublicFormField label="Fecha" htmlFor="appointmentDate" required error={fieldError('appointmentDate')}>
              {({ invalid, errorId }) => (
                <input
                  id="appointmentDate"
                  name="appointmentDate"
                  type="date"
                  min={getLocalDateToday()}
                  value={form.appointmentDate}
                  onChange={onChange}
                  className={`input-premium ${invalid ? inputInvalidClass('appointmentDate') : ''}`}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </PublicFormField>

            <div>
              <p className="label-premium">Hora disponible *</p>
              <FieldErrorMessage message={fieldError('startTime')} />
              {!form.barberId || !form.appointmentDate ? (
                <p className="text-sm text-stone-500">
                  Selecciona barbero y fecha para ver las horas disponibles.
                </p>
              ) : slotsLoading ? (
                <p className="text-sm text-stone-500">Cargando horas…</p>
              ) : slotsError ? (
                <p className="text-sm text-red-600">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No hay horarios libres ese día. Prueba otra fecha.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const active = form.startTime === s;
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, startTime: s }))
                        }
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          active
                            ? 'bg-barber-dark text-white border-barber-dark'
                            : 'bg-white text-stone-700 border-stone-300 hover:border-gold'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
                    className={`input-premium ${invalid ? inputInvalidClass('firstName') : ''}`}
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
                    className={`input-premium ${invalid ? inputInvalidClass('lastName') : ''}`}
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
                    className={`input-premium ${invalid ? inputInvalidClass('email') : ''}`}
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
                    className={`input-premium ${invalid ? inputInvalidClass('phone') : ''}`}
                    placeholder="Solo números"
                    maxLength={15}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>
            </div>

            <div>
              <label className="label-premium" htmlFor="notes">
                Notas
              </label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={onChange}
                className="input-premium resize-none"
                rows={3}
                placeholder="Algo que el barbero deba saber (opcional)"
              />
            </div>

            {(selectedService || selectedBarber) && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-600">
                <p className="text-stone-900 font-semibold mb-1">Resumen</p>
                {selectedService && (
                  <p>
                    {selectedService.name} — {formatPrice(selectedService.price)}
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
