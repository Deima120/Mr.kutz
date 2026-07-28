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
import { validateAppointmentForm, getApiErrorMessage, CLIENT_NOTES_MAX } from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { FieldErrorMessage, FieldHint } from '@/shared/components/FormValidationFields';
import CustomSelect, { formSelectEvent } from '@/shared/components/CustomSelect';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
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
import {
  APPOINTMENT_HORIZON_DAYS_PUBLIC,
  APPOINTMENT_HORIZON_DAYS_STAFF,
  getAppointmentDateBounds,
  validateAppointmentDateYmd,
} from '@/shared/utils/dateRange';
import { getColombiaNowParts } from '@/shared/utils/colombiaTime';

/** True si HH:MM ya pasó en el día de hoy (hora Colombia). */
function isClockTimePastToday(timeStr) {
  const m = String(timeStr || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return false;
  const now = getColombiaNowParts();
  const slotMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const nowMins = now.hour * 60 + now.minute;
  return slotMins <= nowMins;
}

function normalizeServiceLabel(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Prefill de servicios al editar: prioriza `service_ids`; si el backend viejo no los manda,
 * intenta recuperarlos desde `service_name` ("A, B, C") contra el catálogo cargado.
 */
function resolveLoadedServiceIds(appointment, catalog = []) {
  if (Array.isArray(appointment?.service_ids) && appointment.service_ids.length) {
    return appointment.service_ids.map((id) => String(id));
  }

  const label = String(appointment?.service_name || '').trim();
  if (label.includes(',') && catalog.length) {
    const parts = label
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const byName = new Map(
      catalog.map((s) => [normalizeServiceLabel(s.name), s]),
    );
    const matched = parts
      .map((part) => byName.get(normalizeServiceLabel(part)))
      .filter(Boolean);
    if (matched.length >= 2) {
      return matched.map((s) => String(s.id));
    }
  }

  if (appointment?.service_id) return [String(appointment.service_id)];
  return [];
}

const FORM_FIELD_CLASS =
  'w-full px-3.5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-[15px] text-stone-900 placeholder-stone-400 transition-all duration-200 min-h-[42px] ' +
  'bg-stone-50/90 border border-stone-200/90 focus:bg-white focus:border-gold/50 focus:ring-2 focus:ring-gold/20 outline-none';

/** Máximo de servicios por cita; para más, el usuario debe crear otra cita. */
const MAX_SERVICES_PER_APPOINTMENT = 3;
const MAX_SERVICES_MESSAGE =
  'Para agendar más servicios debes crear otra cita.';

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
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint, fieldBorderClass } =
    useFormValidation();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [apptLoading, setApptLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  const selectedServices = useMemo(
    () =>
      formData.serviceIds
        .map((id) => services.find((s) => String(s.id) === String(id)))
        .filter(Boolean),
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

  const dateInputMin = useMemo(() => getLocalDateToday(), []);
  const dateInputMax = useMemo(() => {
    const horizon = isClient ? APPOINTMENT_HORIZON_DAYS_PUBLIC : APPOINTMENT_HORIZON_DAYS_STAFF;
    return getAppointmentDateBounds({ horizonDays: horizon }).max;
  }, [isClient]);

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
        const today = getLocalDateToday();
        let apptDate = extractAppointmentDateYmd(a.appointment_date);
        let startTime = formatAppointmentClockTime(a.start_time);
        // No permitir fechas u horas ya pasadas al editar
        if (!apptDate || apptDate < today) {
          apptDate = today;
          startTime = '';
        } else if (apptDate === today && startTime && isClockTimePastToday(startTime)) {
          startTime = '';
        }
        const loadedServiceIds = resolveLoadedServiceIds(a, services);
        setFormData({
          clientId: String(a.client_id ?? ''),
          barberId: String(a.barber_id ?? ''),
          serviceIds: loadedServiceIds,
          appointmentDate: apptDate,
          startTime,
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
    // `services` se lee del render en que `dataLoaded` pasa a true (mismo batch que setServices).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evitar resetear el form si cambia la ref del catálogo
  }, [isEdit, editId, dataLoaded]);

  const slotOptions = useMemo(() => {
    const today = getLocalDateToday();
    const raw = Array.isArray(slots) ? slots : [];
    let list = [
      ...new Set(
        raw
          .map((x) => formatAppointmentClockTime(x) || String(x).trim())
          .filter(Boolean),
      ),
    ];
    // Si la fecha es hoy, ocultar horas que ya pasaron
    if (formData.appointmentDate === today) {
      list = list.filter((t) => !isClockTimePastToday(t));
    }
    const selected = formData.startTime
      ? formatAppointmentClockTime(formData.startTime) || formData.startTime.trim()
      : '';
    // Solo conservar la hora elegida si sigue siendo válida (no pasada)
    if (
      selected &&
      !list.includes(selected) &&
      !(formData.appointmentDate === today && isClockTimePastToday(selected))
    ) {
      list.push(selected);
    }
    list.sort((x, y) => x.localeCompare(y, 'es'));
    return list;
  }, [slots, formData.startTime, formData.appointmentDate]);

  // Si la hora seleccionada quedó en el pasado (p. ej. día de hoy), limpiarla
  useEffect(() => {
    const today = getLocalDateToday();
    if (
      formData.appointmentDate === today &&
      formData.startTime &&
      isClockTimePastToday(formData.startTime)
    ) {
      setFormData((prev) => ({ ...prev, startTime: '' }));
    }
  }, [formData.appointmentDate, formData.startTime, slots]);

  const filteredPickerServices = useMemo(() => {
    const q = serviceFilter.trim().toLowerCase();
    const list = services.filter((s) => {
      if (formData.serviceIds.includes(String(s.id))) return false;
      if (!q) return true;
      const name = String(s.name || '').toLowerCase();
      const category = String(s.category_name || s.categoryName || '').toLowerCase();
      return name.includes(q) || category.includes(q);
    });
    return list;
  }, [services, formData.serviceIds, serviceFilter]);

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
    if (name === 'notes' && value.length > CLIENT_NOTES_MAX) return;
    let nextValue =
      name === 'startTime' && value ? formatAppointmentClockTime(value) || value : value;
    if (name === 'appointmentDate' && value) {
      const today = getLocalDateToday();
      if (value < today) nextValue = today;
      else if (value > dateInputMax) nextValue = dateInputMax;
    }
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
    clearFieldError(name);
    if (name === 'serviceIds') clearFieldError('serviceIds');
  };

  const handleBlur = (e) => {
    markTouched(e.target.name);
  };

  const addService = () => {
    if (!servicePicker) return;
    if (formData.serviceIds.length >= MAX_SERVICES_PER_APPOINTMENT) {
      setError(MAX_SERVICES_MESSAGE);
      markTouched('serviceIds');
      return;
    }
    setFormData((prev) => {
      if (prev.serviceIds.includes(servicePicker)) return prev;
      return {
        ...prev,
        serviceIds: [...prev.serviceIds, servicePicker],
        startTime: isEdit ? prev.startTime : '',
      };
    });
    setServicePicker('');
    setError('');
    clearFieldError('serviceIds');
    markTouched('serviceIds');
  };

  const addServiceById = (id) => {
    if (formData.serviceIds.length >= MAX_SERVICES_PER_APPOINTMENT) {
      setError(MAX_SERVICES_MESSAGE);
      markTouched('serviceIds');
      return;
    }
    const sid = String(id);
    setFormData((prev) => {
      if (prev.serviceIds.includes(sid)) return prev;
      return {
        ...prev,
        serviceIds: [...prev.serviceIds, sid],
        startTime: isEdit ? prev.startTime : '',
      };
    });
    setError('');
    clearFieldError('serviceIds');
    markTouched('serviceIds');
  };

  const removeService = (id) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.filter((sid) => sid !== id),
      // En edición, al quitar un servicio se conserva la hora; el cliente la cambia solo si quiere
      startTime: isEdit ? prev.startTime : '',
    }));
    setError((prev) => (prev === MAX_SERVICES_MESSAGE ? '' : prev));
    clearFieldError('serviceIds');
    markTouched('serviceIds');
  };

  const atMaxServices = formData.serviceIds.length >= MAX_SERVICES_PER_APPOINTMENT;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEdit && (apptLoading || loadError)) return;

    const validation = validateAppointmentForm(formData, { isEdit, isClient });
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        let payload;
        if (isClient) {
          payload = {
            serviceIds: formData.serviceIds.map((id) => parseInt(id, 10)),
            appointmentDate: formData.appointmentDate,
            startTime: formData.startTime || undefined,
            notes: formData.notes?.trim() ? formData.notes.trim() : undefined,
          };
        } else {
          payload = {
            clientId: parseInt(formData.clientId, 10),
            barberId: parseInt(formData.barberId, 10),
            serviceIds: formData.serviceIds.map((id) => parseInt(id, 10)),
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
      setError(getApiErrorMessage(err, isEdit ? 'Error al guardar los cambios' : 'Error al crear cita'));
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
  const selectVariant = isClient ? 'public' : 'form';

  const clientValidation = useMemo(
    () =>
      formData.clientId
        ? { valid: true, message: '' }
        : { valid: false, message: 'Selecciona un cliente.' },
    [formData.clientId]
  );
  const barberValidation = useMemo(
    () =>
      formData.barberId
        ? { valid: true, message: '' }
        : { valid: false, message: 'Selecciona un barbero.' },
    [formData.barberId]
  );
  const dateValidation = useMemo(() => {
    if (!formData.appointmentDate) {
      return { valid: false, message: 'Selecciona una fecha.' };
    }
    const horizonDays = isClient ? APPOINTMENT_HORIZON_DAYS_PUBLIC : APPOINTMENT_HORIZON_DAYS_STAFF;
    const check = validateAppointmentDateYmd(
      formData.appointmentDate,
      getAppointmentDateBounds({ horizonDays })
    );
    return check.ok
      ? { valid: true, message: '' }
      : { valid: false, message: check.message };
  }, [formData.appointmentDate, isClient]);
  const timeValidation = useMemo(
    () =>
      formData.startTime
        ? { valid: true, message: '' }
        : { valid: false, message: 'Selecciona una hora disponible.' },
    [formData.startTime]
  );
  const servicesValidation = useMemo(
    () =>
      formData.serviceIds?.length
        ? { valid: true, message: '' }
        : { valid: false, message: isEdit ? 'Selecciona un servicio.' : 'Agrega al menos un servicio.' },
    [formData.serviceIds, isEdit]
  );

  const hintOrError = (name, value, validation, successMessage) => {
    const submitErr = fieldError(name);
    if (submitErr) return <FieldErrorMessage message={submitErr} />;
    const live = buildLiveHint(name, value, validation, successMessage);
    return (
      <FieldHint
        valid={live.valid}
        touched={live.show}
        message={live.message}
        successMessage={live.successMessage}
      />
    );
  };

  const borderFor = (name, value, validation) =>
    fieldError(name)
      ? fieldBorderClass(name, false, value)
      : fieldBorderClass(name, validation.valid, value);

  const handleBack = () => {
    if (onCancel) onCancel();
    else navigate('/appointments');
  };

  const formShellProps = {
    fullBleed: !embedded && !isClient,
    compact: embedded || !isClient,
    contained: isClient && embedded,
    fillHeight: false,
    showBackNav: !(isClient && embedded),
    backTo: '/appointments',
    onBackClick: embedded || isClient ? handleBack : undefined,
    modeBadge: isEdit ? 'Edición' : isClient ? 'Reserva' : 'Alta',
    aside: previewAside,
  };

  const showFormFields = !isEdit || (!apptLoading && !loadError);

  const servicesField = (
    <div className="group">
      <label className={labelClass}>Servicios *</label>
      <>
        <div className="flex gap-2.5">
          <CustomSelect
            value={servicePicker}
            onChange={setServicePicker}
            placeholder={
              !dataLoaded ? 'Cargando...' : services.length === 0 ? 'Sin servicios' : 'Agregar servicio...'
            }
            variant={selectVariant}
            className="flex-1 min-w-0"
            disabled={!dataLoaded || services.length === 0 || atMaxServices}
            options={services
              .filter((s) => !formData.serviceIds.includes(String(s.id)))
              .map((s) => ({
                id: String(s.id),
                label: `${s.name} — ${formatPrice(s.price)} (${s.duration_minutes} min)`,
              }))}
          />
          <button
            type="button"
            onClick={addService}
            disabled={!servicePicker || atMaxServices}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-barber-dark bg-gold/90 hover:bg-gold disabled:opacity-50 shrink-0 min-h-[42px]"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Agregar
          </button>
        </div>
        {atMaxServices && (
          <AppInlineAlert variant="warning" className="mt-2 text-xs py-2 px-3">
            {MAX_SERVICES_MESSAGE}
          </AppInlineAlert>
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
      {hintOrError(
        'serviceIds',
        formData.serviceIds.length,
        servicesValidation,
        isEdit ? 'Servicios de la cita.' : 'Servicios agregados.'
      )}
    </div>
  );

  const timeSelect = (
    <div className="group">
      <label className={labelClass}>Hora *</label>
      <CustomSelect
        name="startTime"
        value={formData.startTime}
        onChange={formSelectEvent('startTime', handleChange)}
        onBlur={() => markTouched('startTime')}
        placeholder={
          !formData.barberId
            ? 'Elige barbero primero'
            : formData.serviceIds.length === 0
              ? 'Agrega un servicio'
              : !formData.appointmentDate
                ? 'Elige fecha primero'
                : slotsLoading
                  ? 'Cargando...'
                  : slotOptions.length === 0
                    ? 'Sin horarios'
                    : 'Seleccionar...'
        }
        variant={selectVariant}
        selectClassName={`${fieldClass} ${borderFor('startTime', formData.startTime, timeValidation)}`}
        disabled={
          !formData.barberId ||
          !formData.appointmentDate ||
          formData.serviceIds.length === 0 ||
          slotsLoading
        }
        options={slotOptions.map((slot) => ({ id: slot, label: slot }))}
      />
      {hintOrError('startTime', formData.startTime, timeValidation, 'Hora seleccionada.')}
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
        onBlur={handleBlur}
        min={dateInputMin}
        max={dateInputMax}
        className={`${fieldClass} ${borderFor('appointmentDate', formData.appointmentDate, dateValidation)}`}
      />
      {hintOrError('appointmentDate', formData.appointmentDate, dateValidation, 'Fecha seleccionada.')}
    </div>
  );

  const barberSelect = (
    <div className="group">
      <label className={labelClass}>Barbero *</label>
      <CustomSelect
        name="barberId"
        value={formData.barberId}
        onChange={formSelectEvent('barberId', handleChange)}
        onBlur={() => markTouched('barberId')}
        placeholder={!dataLoaded ? 'Cargando...' : barbers.length === 0 ? 'Sin barberos' : 'Seleccionar...'}
        variant={selectVariant}
        selectClassName={`${fieldClass} ${borderFor('barberId', formData.barberId, barberValidation)}`}
        disabled={!dataLoaded || barbers.length === 0 || (isClient && isEdit)}
        options={barbers.map((b) => ({
          id: String(b.id),
          label: `${b.first_name} ${b.last_name}`,
        }))}
      />
      {hintOrError('barberId', formData.barberId, barberValidation, 'Barbero seleccionado.')}
    </div>
  );

  const clientSelect = !isClient ? (
    <div className="group">
      <label className={labelClass}>Cliente *</label>
      <CustomSelect
        name="clientId"
        value={formData.clientId}
        onChange={formSelectEvent('clientId', handleChange)}
        onBlur={() => markTouched('clientId')}
        placeholder="Seleccionar cliente..."
        variant={selectVariant}
        selectClassName={`${fieldClass} ${borderFor('clientId', formData.clientId, clientValidation)}`}
        options={clients.map((c) => ({
          id: String(c.id),
          label: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ''}`,
        }))}
      />
      {hintOrError('clientId', formData.clientId, clientValidation, 'Cliente seleccionado.')}
    </div>
  ) : null;

  const clientServicesField = (
    <div className="group">
      <label className={labelClass} htmlFor="client-service-filter">
        Servicios *
      </label>
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
              {serviceFilter.trim()
                ? 'No hay servicios con ese nombre.'
                : atMaxServices
                  ? MAX_SERVICES_MESSAGE
                  : formData.serviceIds.length > 0
                    ? 'Ya agregaste todos los servicios disponibles.'
                    : 'No hay servicios para agregar.'}
            </li>
          ) : (
            filteredPickerServices.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => addServiceById(s.id)}
                  disabled={atMaxServices}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
      {atMaxServices && (
        <AppInlineAlert variant="warning" className="mt-2 text-xs py-2 px-3">
          {MAX_SERVICES_MESSAGE}
        </AppInlineAlert>
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
            <AppInlineAlert variant="error" className="text-xs py-2.5 shrink-0">
              {loadError}
            </AppInlineAlert>
          )}

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          {showFormFields && (
            <>
              {dataLoaded && barbers.length === 0 && (
                <AppInlineAlert variant="warning" className="text-xs py-2.5 shrink-0">
                  No hay barberos disponibles en este momento.
                </AppInlineAlert>
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
                  maxLength={CLIENT_NOTES_MAX}
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
              </AdminFormFooterActions>
            </>
          )}
        </AdminFormCard>
      ) : (
      <form
        onSubmit={handleSubmit}
        noValidate
        className={`relative flex flex-col bg-white border border-stone-200/90 shadow-sm ${
          embedded ? 'rounded-2xl' : 'rounded-[1.28rem]'
        }`}
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />

        <div className={`${embedded ? 'px-5 sm:px-6 pt-4 sm:pt-5' : 'px-5 sm:px-7 pt-4 sm:pt-5'} shrink-0`}>
          {!embedded ? (
            <AdminFormCardHeader
              eyebrow="Reserva"
              title={isEdit ? 'Modificar cita' : 'Agendar cita'}
            />
          ) : (
            <div className="flex items-start justify-between gap-4 pb-1">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.28em] text-gold mb-1">
                  {isEdit ? 'Edición' : 'Reserva'}
                </p>
                <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium leading-tight">
                  {isEdit ? 'Modificar cita' : 'Agendar cita'}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Elige barbero, servicio, fecha y hora disponibles.
                </p>
              </div>
              {selectedServices.length > 0 && (
                <div className="text-right shrink-0 rounded-xl bg-gold/10 border border-gold/25 px-3 py-2">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider">Total estimado</p>
                  <p className="text-base font-semibold text-gold tabular-nums">{formatPrice(totalPrice)}</p>
                  <p className="text-[10px] text-stone-500 tabular-nums">{totalDuration} min</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${embedded ? 'px-5 sm:px-6 py-4 sm:py-5' : 'px-5 sm:px-7 py-4 sm:py-5'} flex flex-col gap-4`}>
          {isEdit && apptLoading && (
            <p className="text-xs text-stone-600" role="status">Cargando cita…</p>
          )}

          {isEdit && loadError && !apptLoading && (
            <AppInlineAlert variant="error" className="text-xs py-2.5">
              {loadError}
            </AppInlineAlert>
          )}

          {error && (
            <div className="alert-error text-xs py-2" role="alert">{error}</div>
          )}

          {showFormFields && (
            <>
              {dataLoaded && barbers.length === 0 && (
                <AppInlineAlert variant="warning" className="text-xs py-2.5">
                  No hay barberos disponibles en este momento.
                </AppInlineAlert>
              )}

              <div className="grid gap-4">
                {barberSelect}
                {clientServicesField}
                {dateInput}
                {timeSelect}
              </div>

              <div className="group">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <label className={`${labelClass} mb-0`} htmlFor="client-appointment-notes">
                    Notas
                  </label>
                  <span className="text-[10px] text-stone-400 tabular-nums">
                    {formData.notes.length}/{CLIENT_NOTES_MAX}
                  </span>
                </div>
                <textarea
                  id="client-appointment-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  rows={3}
                  maxLength={CLIENT_NOTES_MAX}
                  className={`${fieldClass} resize-y min-h-[4.5rem]`}
                  placeholder="Preferencias o indicaciones (opcional)"
                />
              </div>
            </>
          )}
        </div>

        {showFormFields && (
          <div className={`sticky bottom-0 border-t border-stone-200/80 bg-white/95 backdrop-blur-sm ${embedded ? 'px-5 sm:px-6 py-3.5' : 'px-5 sm:px-7 py-3.5'} rounded-b-2xl`}>
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
              <AdminFormLoadingButton
                loading={loading}
                loadingLabel={isEdit ? 'Guardando…' : 'Reservando…'}
              >
                {isEdit ? 'Guardar cambios' : 'Confirmar reserva'}
              </AdminFormLoadingButton>
            </AdminFormPrimaryButton>
          </div>
        )}
      </form>
      )}
    </AdminFormShell>
  );
}
