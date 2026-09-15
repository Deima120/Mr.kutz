/**
 * Horarios de trabajo del barbero
 * day_of_week: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Ban, Palmtree, Stethoscope, FileCheck, PartyPopper, CircleHelp } from 'lucide-react';
import * as barberService from '@/features/barbers/services/barberService';
import * as exceptionService from '@/features/barbers/services/barberScheduleExceptionService';
import { validateBarberSchedulesForm, getApiErrorMessage } from '@/shared/utils/formValidation';
import { useAppToast } from '@/shared/feedback/ToastContext';
import AdminFormShell, {
  AdminFormCardHeader,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
} from '@/shared/components/admin/AdminFormShell';
import CustomSelect from '@/shared/components/CustomSelect';
import { onCustomSelectValue } from '@/shared/utils/customSelectAdapters';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminStatusToggle from '@/shared/components/admin/AdminStatusToggle';
import { formatAppointmentCalendarDate } from '@/shared/utils/appointmentTime';

/**
 * Fecha YYYY-MM-DD → "4 nov" para mostrar. No pasa por `new Date(string)`
 * directo (interpretaría la fecha en UTC y podría pintar el día anterior en
 * Colombia, UTC-5) — reutiliza el mismo helper que ya usa `AppointmentsPage`
 * para el mismo problema con `appointment_date`.
 */
const showYmd = (ymd) => formatAppointmentCalendarDate(ymd, 'es-CO', { weekday: undefined, year: 'numeric' });

/** Un vistazo del tipo (ícono + color) para poder distinguirlos de un vistazo en la lista. */
const ABSENCE_TYPE_META = {
  vacation: { label: 'Vacaciones', icon: Palmtree, badge: 'border-sky-200 bg-sky-50 text-sky-700' },
  sick_leave: { label: 'Incapacidad', icon: Stethoscope, badge: 'border-rose-200 bg-rose-50 text-rose-700' },
  permission: { label: 'Permiso', icon: FileCheck, badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  holiday: { label: 'Festivo', icon: PartyPopper, badge: 'border-gold-dark/30 bg-gold-muted text-gold-dark' },
  other: { label: 'Otro', icon: CircleHelp, badge: 'border-stone-200 bg-stone-100 text-stone-600' },
};
const ABSENCE_TYPE_OPTIONS = Object.entries(ABSENCE_TYPE_META).map(([id, meta]) => ({
  id,
  label: meta.label,
}));

const emptyExceptionForm = () => ({ type: 'vacation', dateFrom: '', dateTo: '', reason: '' });

/** Minutos desde medianoche de un "HH:MM", para sumar duraciones de jornada. */
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Resumen de la semana para las cajitas del panel lateral: horas totales y días abiertos. */
function weekSummary(schedules) {
  const openDays = schedules.filter((s) => s.isAvailable);
  const totalMinutes = openDays.reduce(
    (sum, s) => sum + Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime)),
    0
  );
  const totalHours = totalMinutes / 60;
  const hoursLabel = Number.isInteger(totalHours) ? `${totalHours}` : totalHours.toFixed(1);
  return {
    hoursLabel: `${hoursLabel} Horas`,
    daysLabel: `${openDays.length} / 7 Días`,
  };
}

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

/**
 * Hora "HH:MM" a partir de lo que devuelve la API.
 *
 * **No usa `new Date`.** Antes convertía el texto a fecha y leía la hora local
 * del navegador, así que un horario guardado como 09:00 se veía como 04:00 en
 * Colombia. Ahora el backend envía "HH:MM" directo; se mantiene la tolerancia al
 * formato ISO anterior por si el frontend se despliega antes que el backend.
 */
const formatTime = (t, porDefecto = '10:00') => {
  if (!t) return porDefecto;
  const s = String(t);
  const iso = s.match(/T(\d{1,2}):(\d{2})/);
  if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
  const plano = s.match(/^(\d{1,2}):(\d{2})/);
  if (plano) return `${String(plano[1]).padStart(2, '0')}:${plano[2]}`;
  return porDefecto;
};

/**
 * Horario oficial de la barbería: lunes a sábado 10:00-20:00, domingos y
 * festivos 11:00-18:00. Réplica de `SHOP_HOURS` en el backend
 * (`services/barberScheduleRules.js`), que es la fuente de verdad; aquí solo se
 * usa para rellenar el formulario antes de que responda la API.
 */
const horarioEstandar = (dayOfWeek) =>
  dayOfWeek === 0
    ? { startTime: '11:00', endTime: '18:00' }
    : { startTime: '10:00', endTime: '20:00' };

const semanaPorDefecto = () =>
  DAYS.map((d) => ({
    dayOfWeek: d.value,
    ...horarioEstandar(d.value),
    isAvailable: true,
  }));

export default function BarberSchedulesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useAppToast();
  const [barber, setBarber] = useState(null);
  const [schedules, setSchedules] = useState(semanaPorDefecto);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [exceptions, setExceptions] = useState([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(true);
  const [exceptionForm, setExceptionForm] = useState(emptyExceptionForm);
  const [exceptionError, setExceptionError] = useState('');
  const [exceptionSaving, setExceptionSaving] = useState(false);
  // Cuando el rango elegido choca con citas ya agendadas: el backend no crea
  // nada todavía, solo avisa. Este estado guarda esa respuesta para mostrar el
  // modal de "¿confirmas igual?" con la lista real de citas afectadas.
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadExceptions = useCallback(async () => {
    setExceptionsLoading(true);
    try {
      const rows = await exceptionService.getScheduleExceptions({ barberId: id, includeCancelled: true });
      setExceptions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al cargar las ausencias'));
    } finally {
      setExceptionsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [barberData, schedulesData] = await Promise.all([
          barberService.getBarberById(id),
          barberService.getBarberSchedules(id),
        ]);
        const b = barberData?.data ?? barberData;
        setBarber(b);
        const list = Array.isArray(schedulesData) ? schedulesData : (schedulesData?.data ?? []);
        if (list.length > 0) {
          const merged = DAYS.map((d) => {
            const found = list.find((s) => s.day_of_week === d.value || s.dayOfWeek === d.value);
            const estandar = horarioEstandar(d.value);
            return found
              ? {
                  dayOfWeek: d.value,
                  startTime: formatTime(found.start_time || found.startTime, estandar.startTime),
                  endTime: formatTime(found.end_time || found.endTime, estandar.endTime),
                  isAvailable: found.is_available !== false && found.isAvailable !== false,
                }
              : {
                  dayOfWeek: d.value,
                  ...estandar,
                  isAvailable: true,
                };
          });
          setSchedules(merged);
        }
      } catch (err) {
        setError(err?.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (dayOfWeek, field, value) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validation = validateBarberSchedulesForm(schedules);
    if (!validation.valid) {
      setError(validation.firstError || 'Revisa los horarios disponibles.');
      return;
    }
    setSaving(true);
    try {
      await barberService.updateBarberSchedules(id, schedules);
      // Antes el guardado ocurría de verdad pero la pantalla no daba ninguna
      // señal: ni aviso ni navegación, así que parecía que el botón no hacía
      // nada. El aviso sobrevive al cambio de pantalla porque el proveedor de
      // avisos envuelve toda la aplicación, por encima del enrutador.
      toast.success('Horarios actualizados correctamente.');
      navigate('/barbers', { replace: true });
    } catch (err) {
      // El error se queda en el formulario, junto a los campos que hay que
      // corregir, siguiendo la convención de feedback del proyecto.
      setError(getApiErrorMessage(err, 'Error al guardar'));
      setSaving(false);
    }
  };

  const submitException = async (payload) => {
    setExceptionSaving(true);
    setExceptionError('');
    try {
      const result = await exceptionService.createScheduleException(payload);
      if (result?.needsConfirmation) {
        // No se creó nada todavía: el backend avisa y deja decidir.
        setPendingConfirmation({ payload, affectedAppointments: result.affectedAppointments || [] });
        return;
      }
      toast.success('Ausencia registrada correctamente.');
      setExceptionForm(emptyExceptionForm());
      setPendingConfirmation(null);
      await loadExceptions();
    } catch (err) {
      setExceptionError(getApiErrorMessage(err, 'Error al registrar la ausencia'));
    } finally {
      setExceptionSaving(false);
    }
  };

  const handleAddException = (e) => {
    e.preventDefault();
    setExceptionError('');
    if (!exceptionForm.dateFrom || !exceptionForm.dateTo) {
      setExceptionError('Indica la fecha de inicio y de fin.');
      return;
    }
    if (exceptionForm.dateFrom > exceptionForm.dateTo) {
      setExceptionError('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    submitException({
      barberId: id,
      dateFrom: exceptionForm.dateFrom,
      dateTo: exceptionForm.dateTo,
      type: exceptionForm.type,
      reason: exceptionForm.reason.trim() || undefined,
    });
  };

  const handleConfirmAnyway = () => {
    if (!pendingConfirmation) return;
    submitException({ ...pendingConfirmation.payload, confirmed: true });
  };

  const handleCancelException = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await exceptionService.cancelScheduleException(cancelTarget.id);
      toast.success('Ausencia cancelada.');
      setCancelTarget(null);
      await loadExceptions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al cancelar'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !barber) {
    return (
      <div className="space-y-6">
        <div className="py-16 text-center text-stone-500">
          {loading ? 'Cargando…' : 'Barbero no encontrado'}
        </div>
      </div>
    );
  }

  const { hoursLabel, daysLabel } = weekSummary(schedules);

  return (
    <AdminFormShell
      backTo="/barbers"
      modeBadge="Horarios"
      aside={{
        kicker: 'Agenda',
        title: 'Disponibilidad real',
        bullets: [
          'Los clientes solo ven huecos según estos rangos y la duración del servicio.',
          'Desmarca el día para cerrarlo por completo (ej. domingo).',
          'Cambios aquí afectan citas futuras al calcular slots.',
        ],
        statusLabel: 'Barbero',
        statusValue: `${barber.first_name} ${barber.last_name}`,
        stats: [
          { label: 'JORNADA SEMANAL', value: hoursLabel },
          { label: 'DÍAS HABILITADOS', value: daysLabel },
        ],
      }}
    >
      <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col rounded-[1.28rem] bg-white border border-stone-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4">
          <AdminFormCardHeader
            eyebrow="Calendario semanal"
            title="Horarios de trabajo"
          />
          <p className="text-sm text-stone-600 -mt-2">
            Clic en la píldora para abrir o cerrar el día. Un día cerrado no ofrece turnos a los
            clientes, sin borrar el horario que tenía.
          </p>

          {error && <div className="alert-error text-sm py-2.5 shrink-0">{error}</div>}

          <div className="space-y-2">
            {schedules.map((s) => {
              const day = DAYS.find((d) => d.value === s.dayOfWeek);
              return (
                <div
                  key={s.dayOfWeek}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 transition-colors ${
                    s.isAvailable ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50/70'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${s.isAvailable ? 'bg-gold' : 'bg-stone-300'}`}
                    aria-hidden
                  />
                  <span className="font-medium text-stone-800 text-sm w-24 shrink-0">{day?.label}</span>
                  <AdminStatusToggle
                    active={s.isAvailable}
                    onClick={() => handleChange(s.dayOfWeek, 'isAvailable', !s.isAvailable)}
                    activeLabel="Abierto"
                    inactiveLabel="Cerrado"
                    activeTitle="Clic para cerrar este día"
                    inactiveTitle="Clic para abrir este día"
                  />
                  {s.isAvailable ? (
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <input
                        type="time"
                        value={s.startTime}
                        onChange={(e) => handleChange(s.dayOfWeek, 'startTime', e.target.value)}
                        className="input-premium py-2 text-sm max-w-[8.5rem]"
                      />
                      <span className="text-stone-400">—</span>
                      <input
                        type="time"
                        value={s.endTime}
                        onChange={(e) => handleChange(s.dayOfWeek, 'endTime', e.target.value)}
                        className="input-premium py-2 text-sm max-w-[8.5rem]"
                      />
                    </div>
                  ) : (
                    <span className="sm:ml-auto text-sm text-stone-400 italic">Sin turnos ese día</span>
                  )}
                </div>
              );
            })}
          </div>

          <AdminFormFooterActions className="mt-auto">
            <AdminFormPrimaryButton disabled={saving}>{saving ? 'Guardando…' : 'Guardar horarios'}</AdminFormPrimaryButton>
          </AdminFormFooterActions>
        </div>
      </form>

      <div className="relative flex flex-col rounded-[1.28rem] bg-white border border-stone-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden">
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4">
          <AdminFormCardHeader
            eyebrow="Fechas puntuales"
            title="Ausencias y días libres"
          />
          <p className="text-sm text-stone-600 -mt-2">
            Vacaciones, incapacidades, permisos o festivos. No cambian el horario semanal de
            siempre — solo bloquean las fechas exactas que elijas aquí.
          </p>

          <form
            onSubmit={handleAddException}
            className="space-y-3 p-4 rounded-xl bg-stone-50/80 border border-stone-100"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="group min-w-0">
                <span className={ADMIN_FORM_LABEL_CLASS}>Tipo</span>
                <CustomSelect
                  value={exceptionForm.type}
                  onChange={onCustomSelectValue((v) => setExceptionForm((p) => ({ ...p, type: v })))}
                  variant="form"
                  options={ABSENCE_TYPE_OPTIONS}
                />
              </label>
              <label>
                <span className={ADMIN_FORM_LABEL_CLASS}>Desde</span>
                <input
                  type="date"
                  value={exceptionForm.dateFrom}
                  onChange={(e) => setExceptionForm((p) => ({ ...p, dateFrom: e.target.value }))}
                  className={ADMIN_FORM_FIELD_COMPACT}
                />
              </label>
              <label>
                <span className={ADMIN_FORM_LABEL_CLASS}>Hasta</span>
                <input
                  type="date"
                  value={exceptionForm.dateTo}
                  onChange={(e) => setExceptionForm((p) => ({ ...p, dateTo: e.target.value }))}
                  className={ADMIN_FORM_FIELD_COMPACT}
                />
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <label className="flex-1 min-w-0">
                <span className={ADMIN_FORM_LABEL_CLASS}>Motivo (opcional)</span>
                <input
                  type="text"
                  value={exceptionForm.reason}
                  onChange={(e) => setExceptionForm((p) => ({ ...p, reason: e.target.value.slice(0, 300) }))}
                  placeholder="Ej.: viaje familiar"
                  className={ADMIN_FORM_FIELD_COMPACT}
                />
              </label>
              <button
                type="submit"
                disabled={exceptionSaving}
                className="btn-admin-outline text-sm inline-flex items-center gap-1.5 justify-center disabled:opacity-50 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> {exceptionSaving ? 'Guardando…' : 'Registrar ausencia'}
              </button>
            </div>
          </form>
          {exceptionError ? <p className="text-sm text-rose-700 -mt-1">{exceptionError}</p> : null}

          <div className="space-y-2">
            {exceptionsLoading ? (
              <p className="py-4 text-center text-sm text-stone-500">Cargando…</p>
            ) : exceptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">
                Sin ausencias registradas para este barbero.
              </p>
            ) : (
              exceptions.map((ex) => {
                const cancelled = Boolean(ex.cancelledAt);
                const meta = ABSENCE_TYPE_META[ex.type] || ABSENCE_TYPE_META.other;
                const TypeIcon = meta.icon;
                return (
                  <div
                    key={ex.id}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                      cancelled ? 'border-stone-100 bg-stone-50/60 opacity-60' : 'border-stone-200 bg-white'
                    }`}
                  >
                    <div
                      className={`shrink-0 h-9 w-9 rounded-full border flex items-center justify-center ${meta.badge}`}
                      aria-hidden
                    >
                      <TypeIcon className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={`text-sm font-semibold text-stone-900 ${cancelled ? 'line-through' : ''}`}>
                          {meta.label}
                        </p>
                        {ex.batchId ? (
                          <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 border border-gold-dark/40 text-gold-dark">
                            todos los barberos
                          </span>
                        ) : null}
                        {cancelled ? (
                          <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 border border-stone-200 text-stone-500">
                            Cancelada
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-stone-600 tabular-nums">
                        {ex.dateFrom === ex.dateTo
                          ? showYmd(ex.dateFrom)
                          : `${showYmd(ex.dateFrom)} — ${showYmd(ex.dateTo)}`}
                      </p>
                      {ex.reason ? <p className="text-xs text-stone-500 mt-0.5">{ex.reason}</p> : null}
                    </div>
                    {!cancelled ? (
                      <AdminIconButton
                        icon={Ban}
                        label="Cancelar ausencia"
                        onClick={() => setCancelTarget(ex)}
                        className="text-amber-700 shrink-0"
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      <AdminConfirmModal
        open={Boolean(pendingConfirmation)}
        variant="warning"
        title="Hay citas agendadas en ese rango"
        description="Estas citas quedarán con un barbero ausente ese día. Puedes confirmar igual y reagendarlas después, o cancelar y resolverlas primero."
        confirmLabel="Registrar de todas formas"
        isSubmitting={exceptionSaving}
        onConfirm={handleConfirmAnyway}
        onCancel={() => setPendingConfirmation(null)}
      >
        <ul className="space-y-1.5 text-sm text-stone-700">
          {(pendingConfirmation?.affectedAppointments || []).map((a) => (
            <li key={a.id} className="rounded-lg border border-stone-200 px-3 py-2">
              <span className="font-medium">{a.clientName || 'Cliente'}</span> —{' '}
              {showYmd(a.appointmentDate)}
              {a.barberName ? ` · ${a.barberName}` : ''}
            </li>
          ))}
        </ul>
      </AdminConfirmModal>

      <AdminConfirmModal
        open={Boolean(cancelTarget)}
        variant="warning"
        title="¿Cancelar esta ausencia?"
        description={
          cancelTarget
            ? `El barbero vuelve a estar disponible ${
                cancelTarget.dateFrom === cancelTarget.dateTo
                  ? `el ${showYmd(cancelTarget.dateFrom)}`
                  : `entre el ${showYmd(cancelTarget.dateFrom)} y el ${showYmd(cancelTarget.dateTo)}`
              } según su horario semanal normal.`
            : ''
        }
        confirmLabel="Cancelar ausencia"
        isSubmitting={cancelling}
        onConfirm={handleCancelException}
        onCancel={() => setCancelTarget(null)}
      />
    </AdminFormShell>
  );
}
