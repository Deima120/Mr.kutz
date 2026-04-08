/**
 * Formulario para crear nueva cita
 * Misma envoltura visual que el alta de barberos (AdminFormShell + tarjeta editorial).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const stepKickerClass =
  'text-[10px] font-semibold tracking-[0.28em] text-gold mb-3';

export default function AppointmentFormPage() {
  const navigate = useNavigate();
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
    if (isClient && user?.clientId) {
      setFormData((prev) => ({ ...prev, clientId: String(user.clientId) }));
    }
  }, [isClient, user?.clientId]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, startTime: '' }));
    if (formData.barberId && formData.appointmentDate) {
      setSlotsLoading(true);
      appointmentService
        .getAvailableSlots(formData.barberId, formData.appointmentDate)
        .then((slotList) => setSlots(Array.isArray(slotList) ? slotList : []))
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]);
      setSlotsLoading(false);
    }
  }, [formData.barberId, formData.appointmentDate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
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
    } catch (err) {
      setError(err?.message || 'Error al crear cita');
    } finally {
      setLoading(false);
    }
  };

  const formShellProps = isClient
    ? {
        fullBleed: false,
        backTo: '/appointments',
        backLabel: 'Mis citas',
        modeBadge: 'Reserva',
        aside: {
          kicker: 'Tu cita',
          title: 'Reserva con la misma calidad que en sala',
          bullets: [
            'Elige barbero y servicio; la fecha y hora se ajustan a la disponibilidad real.',
            'Las notas son opcionales y ayudan al equipo a preparar tu visita.',
            'Puedes revisar o gestionar tus citas cuando quieras desde el mismo panel.',
          ],
          statusLabel: 'Estado',
          statusValue: 'Nueva reserva',
        },
      }
    : {
        backTo: '/appointments',
        backLabel: 'Citas',
        modeBadge: 'Alta',
        aside: {
          kicker: 'Agenda',
          title: 'Cada cita ordena el día del equipo',
          bullets: [
            'Asigna cliente y barbero; los huecos dependen de la agenda y de citas ya confirmadas.',
            'El servicio define duración y precio en el sistema.',
            'Las notas internas ayudan al barbero sin que el cliente las vea en la app pública.',
          ],
          statusLabel: 'Estado',
          statusValue: 'Alta nueva',
        },
      };

  const outerWrapperClass = isClient
    ? 'min-h-[60vh] bg-stone-100'
    : '';

  const innerWrapperClass = isClient
    ? 'container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-[min(88rem,100%)]'
    : '';

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
            title={isClient ? 'Agendar cita' : 'Nueva cita'}
          />

          {error && (
            <div className="alert-error text-sm py-2.5 shrink-0" role="alert">
              {error}
            </div>
          )}

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
                      disabled={!dataLoaded || barbers.length === 0}
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
                      disabled={!dataLoaded || services.length === 0}
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
                      min={new Date().toISOString().slice(0, 10)}
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
                            : slots.length === 0
                              ? 'Sin horarios para esta fecha'
                              : 'Seleccionar hora...'}
                      </option>
                      {slots.map((slot) => (
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
                    min={new Date().toISOString().slice(0, 10)}
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
                        : formData.barberId && formData.appointmentDate && slots.length === 0
                          ? 'Sin horarios'
                          : 'Seleccionar...'}
                    </option>
                    {slots.map((slot) => (
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
                (isClient && (!dataLoaded || barbers.length === 0 || services.length === 0))
              }
            >
              {loading ? (isClient ? 'Reservando…' : 'Creando…') : isClient ? 'Confirmar reserva' : 'Crear cita'}
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate('/appointments')}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
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
