/**
 * Formulario de alta/edición de cita con resumen en tiempo real y múltiples servicios.
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as clientService from '@/features/clients/services/clientService';
import * as barberService from '@/features/barbers/services/barberService';
import * as serviceService from '@/features/services/services/serviceService';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';
import {
  formatAppointmentClockTime,
  extractAppointmentDateYmd,
  formatAppointmentCalendarDate,
  getLocalDateToday,
} from '@/shared/utils/appointmentTime';

const FORM_FIELD_CLASS =
  'w-full px-3.5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-[15px] text-stone-900 placeholder-stone-400 transition-all duration-200 min-h-[42px] ' +
  'bg-stone-50/90 border border-stone-200/90 focus:bg-white focus:border-gold/50 focus:ring-2 focus:ring-gold/20 outline-none';

const FORM_FILTER_CLASS =
  'w-full pl-9 pr-3.5 py-2 rounded-xl text-sm text-stone-900 placeholder-stone-400 transition-all duration-200 min-h-[38px] ' +
  'bg-white border border-stone-200/90 focus:border-gold/50 focus:ring-2 focus:ring-gold/20 outline-none';

function FieldFilter({ value, onChange, placeholder, id }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={FORM_FILTER_CLASS}
        autoComplete="off"
      />
    </div>
  );
}

const FORM_LABEL_CLASS =
  'block text-[11px] sm:text-xs font-bold tracking-wider text-stone-500 mb-1.5 group-focus-within:text-gold-dark transition-colors';

function PreviewField({ label, value, multiline = false }) {
  return <AdminFormPreviewField label={label} value={value} multiline={multiline} />;
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export default function AppointmentForm({
  editId = null,
  embedded = false,
  onSuccess,
  onCancel,
  initialDate,
  initialTime,
}) {
  const isEdit = Boolean(editId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'client';
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [servicePicker, setServicePicker] = useState('');
  const [formData, setFormData] = useState(() => ({
    clientId: isClient ? String(user?.clientId ?? '') : '',
    barberId: '',
    serviceIds: [],
    appointmentDate: initialDate || searchParams.get('date') || getLocalDateToday(),
    startTime: initialTime || searchParams.get('time') || '',
    notes: '',
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [apptLoading, setApptLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  const selectedServices = useMemo(
    () => services.filter((s) => formData.serviceIds.includes(String(s.id))),
    [services, formData.serviceIds],
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.duration_minutes || s.durationMinutes || 0), 0),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0),
    [selectedServices],
  );

  const dateInputMin = useMemo(() => {
    const today = getLocalDateToday();
    if (!isEdit || !formData.appointmentDate) return today;
    return formData.appointmentDate < today ? formData.appointmentDate : today;
  }, [isEdit, formData.appointmentDate]);

  const selectedClient = useMemo(() => {
    if (isClient) {
      return {
        first_name: user?.firstName,
        last_name: user?.lastName,
        email: user?.email,
      };
    }
    return clients.find((c) => String(c.id) === String(formData.clientId));
  }, [isClient, user, clients, formData.clientId]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => String(b.id) === String(formData.barberId)),
    [barbers, formData.barberId],
  );

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
        const apptDate = extractAppointmentDateYmd(a.appointment_date);
        setFormData({
          clientId: String(a.client_id ?? ''),
          barberId: String(a.barber_id ?? ''),
          serviceIds: a.service_id ? [String(a.service_id)] : [],
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
          .filter(Boolean),
      ),
    ];
    const selected = formData.startTime
      ? formatAppointmentClockTime(formData.startTime) || formData.startTime.trim()
      : '';
    if (selected && !list.includes(selected)) list.push(selected);
    list.sort((x, y) => x.localeCompare(y, 'es'));
    return list;
  }, [slots, formData.startTime]);

  const filteredPickerServices = useMemo(() => {
    const q = serviceFilter.trim().toLowerCase();
    const list = services.filter((s) => {
      if (!isEdit && formData.serviceIds.includes(String(s.id))) return false;
      if (!q) return true;
      const name = String(s.name || '').toLowerCase();
      const category = String(s.category_name || s.categoryName || '').toLowerCase();
      return name.includes(q) || category.includes(q);
    });
    if (isEdit && formData.serviceIds[0]) {
      const selected = services.find((s) => String(s.id) === String(formData.serviceIds[0]));
      if (selected && !list.some((s) => String(s.id) === String(selected.id))) {
        return [selected, ...list];
      }
    }
    return list;
  }, [services, formData.serviceIds, serviceFilter, isEdit]);

  useEffect(() => {
    if (formData.barberId && formData.appointmentDate) {
      setSlotsLoading(true);
      const duration = totalDuration > 0 ? totalDuration : 30;
      appointmentService
        .getAvailableSlots(
          formData.barberId,
          formData.appointmentDate,
          isEdit ? editId : undefined,
          duration,
        )
        .then((slotList) => setSlots(Array.isArray(slotList) ? slotList : []))
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]);
      setSlotsLoading(false);
    }
  }, [formData.barberId, formData.appointmentDate, isEdit, editId, totalDuration]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'startTime' && value ? formatAppointmentClockTime(value) || value : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (
        !isEdit &&
        (name === 'appointmentDate' || name === 'barberId')
      ) {
        next.startTime = '';
      }
      if (isEdit && (name === 'appointmentDate' || name === 'barberId')) {
        next.startTime = '';
      }
      return next;
    });
    setError('');
  };

  const addService = () => {
    if (!servicePicker) return;
    setFormData((prev) => {
      if (prev.serviceIds.includes(servicePicker)) return prev;
      return { ...prev, serviceIds: [...prev.serviceIds, servicePicker], startTime: isEdit ? prev.startTime : '' };
    });
    setServicePicker('');
    setError('');
  };

  const addServiceById = (id) => {
    const sid = String(id);
    setFormData((prev) => {
      if (prev.serviceIds.includes(sid)) return prev;
      return { ...prev, serviceIds: [...prev.serviceIds, sid], startTime: isEdit ? prev.startTime : '' };
    });
    setError('');
  };

  const removeService = (id) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.filter((sid) => sid !== id),
      startTime: isEdit ? prev.startTime : '',
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit && (apptLoading || loadError)) return;
    if (!isEdit && formData.serviceIds.length === 0) {
      setError('Agrega al menos un servicio.');
      return;
    }
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
            serviceId: parseInt(formData.serviceIds[0], 10),
            appointmentDate: formData.appointmentDate,
            startTime: formData.startTime || undefined,
            notes: formData.notes?.trim() ? formData.notes.trim() : undefined,
          };
        }
        await appointmentService.updateAppointment(editId, payload);
        onSuccess?.({ updated: true });
      } else {
        const payload = {
          barberId: parseInt(formData.barberId, 10),
          serviceIds: formData.serviceIds.map((id) => parseInt(id, 10)),
          appointmentDate: formData.appointmentDate,
          startTime: formData.startTime || undefined,
          notes: formData.notes || undefined,
        };
        if (!isClient) payload.clientId = parseInt(formData.clientId, 10);
        else if (user?.clientId) payload.clientId = user.clientId;
        await appointmentService.createAppointment(payload);
        onSuccess?.({ created: true });
      }
    } catch (err) {
      setError(err?.message || (isEdit ? 'Error al guardar los cambios' : 'Error al crear cita'));
    } finally {
      setLoading(false);
    }
  };

  const previewAside = {
    kicker: 'Vista previa',
    title: isEdit ? 'Cita en edición' : 'Nueva cita',
    subtitle: selectedClient
      ? `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim()
      : 'Completa los datos',
    bullets: [],
    statusLabel: 'Estado',
    statusValue: isEdit ? 'Modo edición' : 'Registro nuevo',
    children: (
      <AdminFormPreviewPanel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 -mt-2">
          {!isClient && (
            <PreviewField
              label="Cliente"
              value={
                selectedClient
                  ? `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim()
                  : ''
              }
            />
          )}
          <PreviewField
            label="Barbero"
            value={
              selectedBarber
                ? `${selectedBarber.first_name || ''} ${selectedBarber.last_name || ''}`.trim()
                : ''
            }
          />
          <PreviewField
            label="Fecha"
            value={
              formData.appointmentDate
                ? formatAppointmentCalendarDate(formData.appointmentDate)
                : ''
            }
          />
          <PreviewField
            label="Hora"
            value={formData.startTime ? formatAppointmentClockTime(formData.startTime) : ''}
          />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] tracking-widest text-stone-500 mb-1.5">Servicios</p>
          {selectedServices.length === 0 ? (
            <p className="text-white text-sm sm:text-[15px] font-medium">—</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedServices.map((s) => (
                <li key={s.id} className="text-sm text-stone-200 flex justify-between gap-2">
                  <span className="truncate">{s.name}</span>
                  <span className="text-gold tabular-nums shrink-0 text-sm">{formatPrice(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedServices.length > 0 && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-700/80">
            <span className="text-stone-400 text-sm">{totalDuration} min</span>
            <span className="text-gold font-semibold tabular-nums text-base">{formatPrice(totalPrice)}</span>
          </div>
        )}
        {formData.notes && (
          <PreviewField label="Notas" value={formData.notes} multiline />
        )}
      </AdminFormPreviewPanel>
    ),
  };

  const fieldClass = isClient ? FORM_FIELD_CLASS : ADMIN_FORM_FIELD_COMPACT;
  const labelClass = isClient ? FORM_LABEL_CLASS : ADMIN_FORM_LABEL_CLASS;

  const handleBack = () => {
    if (onCancel) onCancel();
    else navigate('/appointments');
  };

  const formShellProps = {
    fullBleed: !embedded && !isClient,
    compact: embedded || !isClient,
    contained: isClient && embedded,
    fillHeight: isClient && embedded,
    showBackNav: !embedded,
    backTo: '/appointments',
    backLabel: isClient ? 'Mis citas' : 'Citas',
    onBackClick: undefined,
    modeBadge: isEdit ? 'Edición' : isClient ? 'Reserva' : 'Alta',
    aside: previewAside,
  };

  const showFormFields = !isEdit || (!apptLoading && !loadError);

  const servicesField = (
    <div className="group">
      <label className={labelClass}>Servicios *</label>
      {!isEdit ? (
        <>
          <div className="flex gap-2.5">
            <select
              value={servicePicker}
              onChange={(e) => setServicePicker(e.target.value)}
              className={`${fieldClass} flex-1 min-w-0`}
              disabled={!dataLoaded || services.length === 0}
            >
              <option value="">
                {!dataLoaded ? 'Cargando...' : services.length === 0 ? 'Sin servicios' : 'Agregar servicio...'}
              </option>
              {services
                .filter((s) => !formData.serviceIds.includes(String(s.id)))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatPrice(s.price)} ({s.duration_minutes} min)
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={addService}
              disabled={!servicePicker}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-barber-dark bg-gold/90 hover:bg-gold disabled:opacity-50 shrink-0 min-h-[42px]"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Agregar
            </button>
          </div>
          {formData.serviceIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedServices.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-800"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-stone-400 tabular-nums text-xs">{s.duration_minutes} min</span>
                  <button
                    type="button"
                    onClick={() => removeService(String(s.id))}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                    aria-label={`Quitar ${s.name}`}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <select
          name="serviceIds"
          value={formData.serviceIds[0] || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, serviceIds: e.target.value ? [e.target.value] : [] }))
          }
          className={fieldClass}
          required
          disabled={isClient && isEdit}
        >
          <option value="">Seleccionar servicio...</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatPrice(s.price)} ({s.duration_minutes} min)
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const timeSelect = (
    <div className="group">
      <label className={labelClass}>Hora *</label>
      <select
        name="startTime"
        value={formData.startTime}
        onChange={handleChange}
        className={fieldClass}
        required
        disabled={
          !formData.barberId ||
          !formData.appointmentDate ||
          formData.serviceIds.length === 0 ||
          slotsLoading
        }
      >
        <option value="">
          {!formData.barberId
            ? 'Elige barbero primero'
            : formData.serviceIds.length === 0
              ? 'Agrega un servicio'
              : !formData.appointmentDate
                ? 'Elige fecha primero'
              : slotsLoading
                ? 'Cargando...'
                : slotOptions.length === 0
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
  );

  const dateInput = (
    <div className="group">
      <label className={labelClass}>Fecha *</label>
      <input
        name="appointmentDate"
        type="date"
        value={formData.appointmentDate}
        onChange={handleChange}
        min={dateInputMin}
        className={fieldClass}
        required
      />
    </div>
  );

  const barberSelect = (
    <div className="group">
      <label className={labelClass}>Barbero *</label>
      <select
        name="barberId"
        value={formData.barberId}
        onChange={handleChange}
        className={fieldClass}
        required
        disabled={!dataLoaded || barbers.length === 0 || (isClient && isEdit)}
      >
        <option value="">
          {!dataLoaded ? 'Cargando...' : barbers.length === 0 ? 'Sin barberos' : 'Seleccionar...'}
        </option>
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.first_name} {b.last_name}
          </option>
        ))}
      </select>
    </div>
  );

  const clientSelect = !isClient ? (
    <div className="group">
      <label className={labelClass}>Cliente *</label>
      <select
        name="clientId"
        value={formData.clientId}
        onChange={handleChange}
        className={fieldClass}
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
  ) : null;

  const clientServicesField = (
    <div className="group">
      <label className={labelClass} htmlFor="client-service-filter">
        Servicios *
      </label>
      {!isEdit ? (
        <>
          <FieldFilter
            id="client-service-filter"
            value={serviceFilter}
            onChange={setServiceFilter}
            placeholder="Buscar servicio por nombre o categoría…"
          />
          {!dataLoaded ? (
            <p className="text-sm text-stone-500 mt-2">Cargando servicios…</p>
          ) : (
            <ul
              className="mt-2 rounded-xl border border-stone-200/90 bg-white divide-y divide-stone-100 max-h-44 overflow-y-auto"
              aria-live="polite"
            >
              {filteredPickerServices.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-stone-500">
                  {serviceFilter.trim() ? 'No hay servicios con ese nombre.' : 'Ya agregaste todos los servicios.'}
                </li>
              ) : (
                filteredPickerServices.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => addServiceById(s.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-stone-900 block truncate">{s.name}</span>
                        {(s.category_name || s.categoryName) && (
                          <span className="text-xs text-stone-400 truncate block">
                            {s.category_name || s.categoryName}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-stone-500 tabular-nums text-right">
                        {formatPrice(s.price)}
                        <span className="block">{s.duration_minutes || s.durationMinutes} min</span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          {formData.serviceIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedServices.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-800"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-stone-400 tabular-nums text-xs">{s.duration_minutes} min</span>
                  <button
                    type="button"
                    onClick={() => removeService(String(s.id))}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                    aria-label={`Quitar ${s.name}`}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={`${fieldClass} text-stone-700`}>
          {selectedServices[0]
            ? `${selectedServices[0].name} — ${formatPrice(selectedServices[0].price)}`
            : '—'}
        </div>
      )}
    </div>
  );

  return (
    <AdminFormShell {...formShellProps}>
      {!isClient ? (
        <AdminFormCard onSubmit={handleSubmit}>
          {!embedded ? (
            <AdminFormCardHeader
              eyebrow="Cita"
              title={isEdit ? 'Editar cita' : 'Nueva cita'}
            />
          ) : (
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.28em] text-gold mb-1">
                  {isEdit ? 'Edición' : 'Nueva cita'}
                </p>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium leading-tight">
                  {isEdit ? 'Editar cita' : 'Registrar cita'}
                </h2>
              </div>
              {selectedServices.length > 0 && (
                <div className="text-right shrink-0 rounded-xl bg-gold/10 border border-gold/25 px-3 py-2">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider">Total estimado</p>
                  <p className="text-base font-semibold text-gold tabular-nums">{formatPrice(totalPrice)}</p>
                </div>
              )}
            </div>
          )}

          {isEdit && apptLoading && (
            <p className="text-xs text-stone-600 shrink-0" role="status">Cargando cita…</p>
          )}

          {isEdit && loadError && !apptLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs p-2.5 shrink-0" role="alert">
              <p>{loadError}</p>
            </div>
          )}

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          {showFormFields && (
            <>
              {dataLoaded && barbers.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs p-2.5 shrink-0" role="status">
                  No hay barberos disponibles en este momento.
                </div>
              )}

              {clientSelect}

              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-1">
                {barberSelect}
                {servicesField}
                {timeSelect}
                {dateInput}
              </div>

              <div className="group">
                <label className={labelClass}>Notas</label>
                <input
                  name="notes"
                  type="text"
                  value={formData.notes}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="Preferencias o indicaciones (opcional)"
                />
              </div>

              <AdminFormFooterActions className={`${embedded ? 'pt-3 mt-1' : 'mt-1'} border-t border-stone-200/80`}>
                <AdminFormPrimaryButton
                  disabled={
                    loading ||
                    apptLoading ||
                    !!loadError ||
                    (!isEdit && formData.serviceIds.length === 0)
                  }
                >
                  <AdminFormLoadingButton loading={loading} loadingLabel={isEdit ? 'Guardando…' : 'Creando…'}>
                    {isEdit ? 'Guardar cambios' : 'Crear cita'}
                  </AdminFormLoadingButton>
                </AdminFormPrimaryButton>
                <AdminFormSecondaryButton onClick={handleBack}>Cancelar</AdminFormSecondaryButton>
              </AdminFormFooterActions>
            </>
          )}
        </AdminFormCard>
      ) : (
      <form
        onSubmit={handleSubmit}
        className={`relative flex flex-col bg-white/95 border border-white ${embedded ? 'rounded-2xl h-full min-h-0 flex flex-col overflow-hidden' : 'rounded-[1.28rem] h-full min-h-0 overflow-hidden'}`}
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className={`flex flex-col flex-1 min-h-0 ${embedded ? 'px-5 sm:px-6 py-4 sm:py-5 gap-4 overflow-y-auto' : 'px-5 py-4 sm:px-7 sm:py-5 gap-4 overflow-y-auto'}`}>
          {!embedded ? (
            <AdminFormCardHeader
              eyebrow="Reserva"
              title={isEdit ? 'Modificar cita' : 'Agendar cita'}
            />
          ) : (
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.28em] text-gold mb-1">
                  {isEdit ? 'Edición' : 'Nueva cita'}
                </p>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium leading-tight">
                  {isEdit ? 'Editar cita' : 'Registrar cita'}
                </h2>
              </div>
              {selectedServices.length > 0 && (
                <div className="text-right shrink-0 rounded-xl bg-gold/10 border border-gold/25 px-3 py-2">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider">Total estimado</p>
                  <p className="text-base font-semibold text-gold tabular-nums">{formatPrice(totalPrice)}</p>
                </div>
              )}
            </div>
          )}

          {isEdit && apptLoading && (
            <p className="text-xs text-stone-600 shrink-0" role="status">Cargando cita…</p>
          )}

          {isEdit && loadError && !apptLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs p-2.5 shrink-0" role="alert">
              <p>{loadError}</p>
            </div>
          )}

          {error && (
            <div className="alert-error text-xs py-2 shrink-0" role="alert">{error}</div>
          )}

          {showFormFields && (
            <>
              {dataLoaded && barbers.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs p-2.5 shrink-0" role="status">
                  No hay barberos disponibles en este momento.
                </div>
              )}

              <div className="grid gap-3.5 sm:grid-cols-1">
                {barberSelect}
                {clientServicesField}
                {timeSelect}
                {dateInput}
              </div>

              <div className="group">
                <label className={labelClass}>Notas</label>
                <input
                  name="notes"
                  type="text"
                  value={formData.notes}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="Preferencias o indicaciones (opcional)"
                />
              </div>

              <AdminFormFooterActions className={`${embedded ? 'pt-3 mt-1' : 'mt-auto'} border-t border-stone-200/80`}>
                <AdminFormPrimaryButton
                  disabled={
                    loading ||
                    apptLoading ||
                    !!loadError ||
                    !dataLoaded ||
                    barbers.length === 0 ||
                    services.length === 0 ||
                    (!isEdit && formData.serviceIds.length === 0)
                  }
                >
                  {loading
                    ? isEdit ? 'Guardando…' : 'Reservando…'
                    : isEdit ? 'Guardar cambios' : 'Confirmar reserva'}
                </AdminFormPrimaryButton>
                <AdminFormSecondaryButton onClick={handleBack}>Cancelar</AdminFormSecondaryButton>
              </AdminFormFooterActions>
            </>
          )}
        </div>
      </form>
      )}
    </AdminFormShell>
  );
}
