/**
 * Horarios de trabajo del barbero
 * day_of_week: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as barberService from '@/features/barbers/services/barberService';
import AdminFormShell, {
  AdminFormCardHeader,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
} from '@/shared/components/admin/AdminFormShell';

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const formatTime = (t) => {
  if (!t) return '09:00';
  if (t instanceof Date) {
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const s = String(t);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && s.includes('T')) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const iso = s.match(/T(\d{1,2}):(\d{2})/);
  if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
  const any = s.match(/(\d{1,2}):(\d{2})/);
  if (any) return `${String(any[1]).padStart(2, '0')}:${any[2]}`;
  return s.slice(0, 5);
};

export default function BarberSchedulesPage() {
  const { id } = useParams();
  const [barber, setBarber] = useState(null);
  const [schedules, setSchedules] = useState(DAYS.map((d) => ({
    dayOfWeek: d.value,
    startTime: '09:00',
    endTime: '18:00',
    isAvailable: d.value !== 0,
  })));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
            return found
              ? {
                  dayOfWeek: d.value,
                  startTime: formatTime(found.start_time || found.startTime),
                  endTime: formatTime(found.end_time || found.endTime),
                  isAvailable: found.is_available !== false && found.isAvailable !== false,
                }
              : {
                  dayOfWeek: d.value,
                  startTime: '09:00',
                  endTime: '18:00',
                  isAvailable: d.value !== 0,
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
    setSaving(true);
    setError('');
    try {
      await barberService.updateBarberSchedules(id, schedules);
      setError('');
    } catch (err) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
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

  return (
    <AdminFormShell
      backTo="/barbers"
      backLabel="Barberos"
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
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader
            eyebrow="Calendario semanal"
            title="Horarios de trabajo"
          />
          <p className="text-sm text-stone-600 -mt-2">
            Ajusta inicio y fin por día. Si un día no está disponible, desmarca la casilla.
          </p>

          {error && <div className="alert-error text-sm py-2.5 shrink-0">{error}</div>}

          <div className="space-y-1">
            {schedules.map((s) => {
              const day = DAYS.find((d) => d.value === s.dayOfWeek);
              return (
                <div
                  key={s.dayOfWeek}
                  className="flex flex-wrap items-center gap-4 py-3 border-b border-stone-100 last:border-0"
                >
                  <label className="flex items-center gap-2 w-36 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={s.isAvailable}
                      onChange={(e) => handleChange(s.dayOfWeek, 'isAvailable', e.target.checked)}
                      className="rounded border-stone-300 text-gold focus:ring-gold/40"
                    />
                    <span className="font-medium text-stone-800 text-sm">{day?.label}</span>
                  </label>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="time"
                      value={s.startTime}
                      onChange={(e) => handleChange(s.dayOfWeek, 'startTime', e.target.value)}
                      disabled={!s.isAvailable}
                      className="input-premium py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400 max-w-[8.5rem]"
                    />
                    <span className="text-stone-400">—</span>
                    <input
                      type="time"
                      value={s.endTime}
                      onChange={(e) => handleChange(s.dayOfWeek, 'endTime', e.target.value)}
                      disabled={!s.isAvailable}
                      className="input-premium py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400 max-w-[8.5rem]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <AdminFormFooterActions className="mt-auto">
            <AdminFormPrimaryButton disabled={saving}>{saving ? 'Guardando…' : 'Guardar horarios'}</AdminFormPrimaryButton>
            <Link
              to="/barbers"
              className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-stone-600 bg-white border border-stone-200 shadow-sm hover:bg-stone-50 transition-all"
            >
              Cancelar
            </Link>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
