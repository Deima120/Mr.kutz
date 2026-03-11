/**
 * Horarios de trabajo del barbero
 * day_of_week: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as barberService from '../../services/barberService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const formatTime = (t) => (t ? String(t).slice(0, 5) : '09:00');

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
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
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
        <div className="py-16 text-center text-gray-500">
          {loading ? 'Cargando...' : 'Barbero no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios"
        subtitle={`${barber.first_name} ${barber.last_name}`}
        actions={
          <Link
            to="/barbers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver a barberos
          </Link>
        }
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <DataCard>
          <p className="text-sm text-gray-600 mb-4">
            Define los horarios de atención de cada día. Deja desmarcado &quot;Disponible&quot; para días sin servicio.
          </p>
          <div className="space-y-4">
            {schedules.map((s) => {
              const day = DAYS.find((d) => d.value === s.dayOfWeek);
              return (
                <div
                  key={s.dayOfWeek}
                  className="flex flex-wrap items-center gap-4 py-3 border-b border-gray-100 last:border-0"
                >
                  <label className="flex items-center gap-2 w-32 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.isAvailable}
                      onChange={(e) =>
                        handleChange(s.dayOfWeek, 'isAvailable', e.target.checked)
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="font-medium text-gray-800">{day?.label}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={s.startTime}
                      onChange={(e) =>
                        handleChange(s.dayOfWeek, 'startTime', e.target.value)
                      }
                      disabled={!s.isAvailable}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="text-gray-400">—</span>
                    <input
                      type="time"
                      value={s.endTime}
                      onChange={(e) =>
                        handleChange(s.dayOfWeek, 'endTime', e.target.value)
                      }
                      disabled={!s.isAvailable}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar horarios'}
            </button>
            <Link
              to="/barbers"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              Cancelar
            </Link>
          </div>
        </DataCard>
      </form>
    </div>
  );
}
