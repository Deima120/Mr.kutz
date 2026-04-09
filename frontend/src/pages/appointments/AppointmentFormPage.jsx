/**
 * Formulario para crear nueva cita
 * Misma envoltura visual que el alta de barberos (AdminFormShell + tarjeta editorial).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import * as clientService from '../../services/clientService';
import * as barberService from '../../services/barberService';
import * as serviceService from '../../services/serviceService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';
import { formatAppointmentClockTime } from '../../utils/appointmentTime';

const stepKickerClass =
  'text-[10px] font-semibold tracking-[0.28em] text-gold mb-3';

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [formData, setFormData] = useState({
    clientId: isClient ? String(user?.clientId ?? '') : '',
    barberId: '',
    serviceId: '',
    appointmentDate: new Date().toISOString().slice(0, 10),
    startTime: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [apptLoading, setApptLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  const dateInputMin = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!isEdit || !formData.appointmentDate) return today;
    return formData.appointmentDate < today ? formData.appointmentDate : today;
  }, [isEdit, formData.appointmentDate]);

  useEffect(() => {
    const promises = [barberService.getBarbers(), serviceService.getServices()];
    if (!isClient) promises.unshift(clientService.getClients());
    Promise.all(promises)
      .then((results) => {
        if (!isClient) {
          const [c, b, s] = results;
          setClients(c?.clients || c || []);
          setBarbers(Array.isArray(b) ? b : []);
          setServices(Array.isArray(s) ? s : []);
        } else {
          const [b, s] = results;
          setBarbers(Array.isArray(b) ? b : []);
          setServices(Array.isArray(s) ? s : []);
        }
      })
      .catch(() => {
        setBarbers([]);
        setServices([]);
      })
      .finally(() => setDataLoaded(true));
  }, [isClient]);

  useEffect(() => {
    if (isClient && user?.clientId && !isEdit) {
      setFormData((prev) => ({ ...prev, clientId: String(user.clientId) }));
    }
  }, [isClient, user?.clientId, isEdit]);

  useEffect(() => {
    if (!isEdit || !editId || !dataLoaded) return undefined;
    let cancelled = false;
    setApptLoading(true);
    setLoadError('');
    appointmentService
      .getAppointmentById(editId)
      .then((a) => {
        if (cancelled || !a) return;
        if (['cancelled', 'no_show', 'completed'].includes(a.status)) {
          setLoadError('Esta cita ya no se puede modificar.');
          return;
        }
        const apptDate = a.appointment_date
          ? new Date(a.appointment_date).toISOString().slice(0, 10)
          : '';
        setFormData({
          clientId: String(a.client_id ?? ''),
          barberId: String(a.barber_id ?? ''),
          serviceId: String(a.service_id ?? ''),
          appointmentDate: apptDate,
          startTime: formatAppointmentClockTime(a.start_time),
          notes: a.notes ?? '',
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError('No se pudo cargar la cita.');
      })
      .finally(() => {
        if (!cancelled) setApptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, editId, dataLoaded]);

  const slotOptions = useMemo(() => {
    const raw = Array.isArray(slots) ? slots : [];
    const list = [
      ...new Set(
        raw
          .map((x) => formatAppointmentClockTime(x) || String(x).trim())
          .filter(Boolean)
      ),
    ];
    const selected = formData.startTime
      ? formatAppointmentClockTime(formData.startTime) || formData.startTime.trim()
      : '';
    if (selected && !list.includes(selected)) list.push(selected);
    list.sort((x, y) => x.localeCompare(y, 'es'));
    return list;
  }, [slots, formData.startTime]);

  useEffect(() => {
    if (!isEdit) {
      setFormData((prev) => ({ ...prev, startTime: '' }));
    }
    if (formData.barberId && formData.appointmentDate) {
      setSlotsLoading(true);
      appointmentService
        .getAvailableSlots(formData.barberId, formData.appointmentDate, isEdit ? editId : undefined)
        .then((slotList) => setSlots(Array.isArray(slotList) ? slotList : []))
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]);
      setSlotsLoading(false);
    }
  }, [formData.barberId, formData.appointmentDate, isEdit, editId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'startTime' && value
        ? formatAppointmentClockTime(value) || value
        : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (
        isEdit &&
        (name === 'appointmentDate' || name === 'barberId' || name === 'serviceId')
      ) {
        next.startTime = '';
      }
      return next;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit && (apptLoading || loadError)) return;
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        let payload;
        if (isClient) {
          payload = {
            appointmentDate: formData.appointmentDate,
            startTime: formData.startTime || undefined,
            notes: formData.notes?.trim() ? formData.notes.trim() : undefined,
          };
        } else {
          payload = {
            clientId: parseInt(formData.clientId, 10),
            barberId: parseInt(formData.barberId, 10),
            serviceId: parseInt(formData.serviceId, 10),
            appointmentDate: formData.appointmentDate,
            startTime: formData.startTime || undefined,
            notes: formData.notes?.trim() ? formData.notes.trim() : undefined,
          };
        }
        await appointmentService.updateAppointment(editId, payload);
        navigate('/appointments', {
          replace: true,
          state: { appointmentUpdated: true },
        });
      } else {
        const payload = {
          barberId: parseInt(formData.barberId, 10),
          serviceId: parseInt(formData.serviceId, 10),
          appointmentDate: formData.appointmentDate,
          startTime: formData.startTime || undefined,
          notes: formData.notes || undefined,
        };
        if (!isClient) payload.clientId = parseInt(formData.clientId, 10);
        else if (user?.clientId) payload.clientId = user.clientId;
        await appointmentService.createAppointment(payload);
        navigate('/appointments', { replace: true, state: { appointmentCreated: true } });
      }
    } catch (err) {
      setError(
        err?.message ||
          (isEdit ? 'Error al guardar los cambios' : 'Error al crear cita')
      );
    } finally {
      setLoading(false);
    }
  };

  const formShellProps = isClient
    ? {
        fullBleed: false,
        backTo: '/appointments',
        backLabel: 'Mis citas',
        modeBadge: isEdit ? 'Edición' : 'Reserva',
        aside: {
          kicker: 'Tu cita',
          title: isEdit
            ? 'Ajusta fecha, hora o notas'
            : 'Reserva con la misma calidad que en sala',
          bullets: isEdit
            ? [
                'Puedes cambiar la fecha y la hora si hay huecos libres.',
                'Barbero y servicio no se modifican desde aquí; contacta a la barbería si necesitas otro servicio.',
                'Las notas ayudan al equipo a preparar tu visita.',
              ]
            : [
                'Elige barbero y servicio; la fecha y hora se ajustan a la disponibilidad real.',
                'Las notas son opcionales y ayudan al equipo a preparar tu visita.',
                'Puedes revisar o gestionar tus citas cuando quieras desde el mismo panel.',
              ],
          statusLabel: 'Estado',
          statusValue: isEdit ? 'Modificar reserva' : 'Nueva reserva',
        },
      }
    : {
        backTo: '/appointments',
        backLabel: 'Citas',
        modeBadge: isEdit ? 'Edición' : 'Alta',
        aside: {
          kicker: 'Agenda',
          title: isEdit
            ? 'Actualiza los datos de la cita'
            : 'Cada cita ordena el día del equipo',
          bullets: isEdit
            ? [
                'Puedes reasignar cliente, barbero, servicio, fecha u hora según disponibilidad.',
                'Al cambiar servicio u horario se recalcula la duración automáticamente.',
                'Las notas internas siguen siendo solo para el equipo.',
              ]
            : [
                'Asigna cliente y barbero; los huecos dependen de la agenda y de citas ya confirmadas.',
                'El servicio define duración y precio en el sistema.',
                'Las notas internas ayudan al barbero sin que el cliente las vea en la app pública.',
              ],
          statusLabel: 'Estado',
          statusValue: isEdit ? 'Modificar cita' : 'Alta nueva',
        },
      };

  const outerWrapperClass = isClient
    ? 'min-h-[60vh] bg-stone-100'
    : '';

  const innerWrapperClass = isClient
    ? 'container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-[min(88rem,100%)]'
    : '';

  const showFormFields = !isEdit || (!apptLoading && !loadError);

  const shell = (
    <AdminFormShell {...formShellProps}>
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader
            eyebrow={isClient ? 'Reserva' : 'Cita'}
            title={
              isClient
                ? isEdit
                  ? 'Modificar cita'
                  : 'Agendar cita'
                : isEdit
                  ? 'Editar cita'
                  : 'Nueva cita'
            }
          />

          {isEdit && apptLoading && (
            <p className="text-sm text-stone-600 shrink-0" role="status">
              Cargando cita…
            </p>
          )}

          {isEdit && loadError && !apptLoading && (
            <div className="rounded-xl border border-red-200/90 bg-red-50/95 text-red-900 text-sm p-3.5 shrink-0 space-y-3" role="alert">
              <p>{loadError}</p>
              <Link
                to="/appointments"
                className="inline-flex font-semibold text-red-800 underline underline-offset-2 hover:text-red-950"
              >
                Volver a citas
              </Link>
            </div>
          )}

          {error && (
            <div className="alert-error text-sm py-2.5 shrink-0" role="alert">
              {error}
            </div>
          )}

          {showFormFields && (
          <>
          {dataLoaded && barbers.length === 0 && (
            <div
              className="rounded-xl border border-amber-200/90 bg-amber-50/95 text-amber-900 text-sm p-3.5 shrink-0"
              role="status"
            >
              <p className="font-semibold text-amber-950 mb-1">No hay barberos disponibles</p>
              <p className="text-amber-800/95">
                En este momento no podemos mostrar opciones para agendar. Contacta con la barbería o intenta más tarde.
              </p>
            </div>
          )}

          {dataLoaded && services.length === 0 && barbers.length > 0 && (
            <div
              className="rounded-xl border border-amber-200/90 bg-amber-50/95 text-amber-900 text-sm p-3.5 shrink-0"
              role="status"
            >
              <p className="font-semibold text-amber-950 mb-1">No hay servicios disponibles</p>
              <p className="text-amber-800/95">No hay servicios cargados para elegir. Contacta con la barbería.</p>
            </div>
          )}

          {!isClient && (
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Cliente *</label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isClient ? (
            <>
              <section>
                <p className={stepKickerClass}>Paso 1 — Barbero y servicio</p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="group">
                    <label htmlFor="barberId" className={ADMIN_FORM_LABEL_CLASS}>
                      Barbero *
                    </label>
                    <select
                      id="barberId"
                      name="barberId"
                      value={formData.barberId}
                      onChange={handleChange}
                      className={ADMIN_FORM_FIELD_CLASS}
                      required
                      disabled={!dataLoaded || barbers.length === 0 || (isClient && isEdit)}
                    >
                      <option value="">
                        {!dataLoaded
                          ? 'Cargando...'
                          : barbers.length === 0
                            ? 'No hay barberos disponibles'
                            : 'Seleccionar barbero...'}
                      </option>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.first_name} {b.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="group">
                    <label htmlFor="serviceId" className={ADMIN_FORM_LABEL_CLASS}>
                      Servicio *
                    </label>
                    <select
                      id="serviceId"
                      name="serviceId"
                      value={formData.serviceId}
                      onChange={handleChange}
                      className={ADMIN_FORM_FIELD_CLASS}
                      required
                      disabled={!dataLoaded || services.length === 0 || (isClient && isEdit)}
                    >
                      <option value="">
                        {!dataLoaded
                          ? 'Cargando...'
                          : services.length === 0
                            ? 'No hay servicios disponibles'
                            : 'Seleccionar servicio...'}
                      </option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — ${s.price} ({s.duration_minutes} min)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="border-t border-stone-200/80 pt-4">
                <p className={stepKickerClass}>Paso 2 — Fecha y hora</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="group">
                    <label htmlFor="appointmentDate" className={ADMIN_FORM_LABEL_CLASS}>
                      Fecha *
                    </label>
                    <input
                      id="appointmentDate"
                      name="appointmentDate"
                      type="date"
                      value={formData.appointmentDate}
                      onChange={handleChange}
                      min={dateInputMin}
                      className={ADMIN_FORM_FIELD_CLASS}
                      required
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="startTime" className={ADMIN_FORM_LABEL_CLASS}>
                      Hora *
                    </label>
                    <select
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className={ADMIN_FORM_FIELD_CLASS}
                      required
                      disabled={!formData.barberId || !formData.appointmentDate || slotsLoading}
                    >
                      <option value="">
                        {!formData.barberId || !formData.appointmentDate
                          ? 'Elige primero barbero y fecha'
                          : slotsLoading
                            ? 'Cargando horarios...'
                            : slotOptions.length === 0
                              ? 'Sin horarios para esta fecha'
                              : 'Seleccionar hora...'}
                      </option>
                      {slotOptions.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="border-t border-stone-200/80 pt-4">
                <p className={stepKickerClass}>Opcional</p>
                <div className="group">
                  <label htmlFor="notes" className={ADMIN_FORM_LABEL_CLASS}>
                    Notas (ej. preferencia de corte)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    className={`${ADMIN_FORM_FIELD_CLASS} resize-none`}
                    placeholder="Algo que quieras que sepamos..."
                  />
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="group">
                  <label className={ADMIN_FORM_LABEL_CLASS}>Barbero *</label>
                  <select
                    name="barberId"
                    value={formData.barberId}
                    onChange={handleChange}
                    className={ADMIN_FORM_FIELD_CLASS}
                    required
                  >
                    <option value="">Seleccionar barbero...</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.first_name} {b.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="group">
                  <label className={ADMIN_FORM_LABEL_CLASS}>Servicio *</label>
                  <select
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleChange}
                    className={ADMIN_FORM_FIELD_CLASS}
                    required
                  >
                    <option value="">Seleccionar servicio...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ${s.price} ({s.duration_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="group">
                  <label className={ADMIN_FORM_LABEL_CLASS}>Fecha *</label>
                  <input
                    name="appointmentDate"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={handleChange}
                    min={dateInputMin}
                    className={ADMIN_FORM_FIELD_CLASS}
                    required
                  />
                </div>
                <div className="group">
                  <label className={ADMIN_FORM_LABEL_CLASS}>Hora *</label>
                  <select
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className={ADMIN_FORM_FIELD_CLASS}
                    required
                    disabled={slotsLoading}
                  >
                    <option value="">
                      {slotsLoading
                        ? 'Cargando...'
                        : formData.barberId && formData.appointmentDate && slotOptions.length === 0
                          ? 'Sin horarios'
                          : 'Seleccionar...'}
                    </option>
                    {slotOptions.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="group">
                <label className={ADMIN_FORM_LABEL_CLASS}>Notas</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className={`${ADMIN_FORM_FIELD_CLASS} resize-none`}
                />
              </div>
            </>
          )}

          <AdminFormFooterActions className="mt-auto">
            <AdminFormPrimaryButton
              disabled={
                loading ||
                apptLoading ||
                !!loadError ||
                (isClient && (!dataLoaded || barbers.length === 0 || services.length === 0))
              }
            >
              {loading
                ? isEdit
                  ? 'Guardando…'
                  : isClient
                    ? 'Reservando…'
                    : 'Creando…'
                : isEdit
                  ? 'Guardar cambios'
                  : isClient
                    ? 'Confirmar reserva'
                    : 'Crear cita'}
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate('/appointments')}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
          </>
          )}
        </div>
      </form>
    </AdminFormShell>
  );

  if (isClient) {
    return (
      <div className={outerWrapperClass}>
        <div className={innerWrapperClass}>{shell}</div>
      </div>
    );
  }

  return shell;
}
