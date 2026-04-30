/**
 * Satisfacción (admin): valoraciones reales de citas completadas
 */

import { useState, useEffect } from 'react';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as barberService from '@/features/barbers/services/barberService';
import AppointmentRatingsPanel from '@/shared/components/admin/AppointmentRatingsPanel';

export default function TestimonialsPage() {
  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingError, setRatingError] = useState('');
  const [ratingPeriod, setRatingPeriod] = useState('30');
  const [ratingBarberId, setRatingBarberId] = useState('');
  const [barbers, setBarbers] = useState([]);

  useEffect(() => {
    barberService
      .getBarbers()
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data?.data ?? []);
        setBarbers(raw);
      })
      .catch(() => setBarbers([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRatings = async () => {
      setRatingLoading(true);
      setRatingError('');
      try {
        const params = {};
        if (ratingPeriod && ratingPeriod !== 'all') {
          const d = parseInt(ratingPeriod, 10);
          if (Number.isFinite(d) && d > 0) params.days = d;
        } else {
          params.days = 'all';
        }
        if (ratingBarberId) params.barberId = ratingBarberId;
        const data = await appointmentService.getAppointmentRatingSummary(params);
        if (!cancelled) setRatingSummary(data && typeof data === 'object' ? data : null);
      } catch (err) {
        if (!cancelled) {
          setRatingError(err?.message || 'Error al cargar valoraciones');
          setRatingSummary(null);
        }
      } finally {
        if (!cancelled) setRatingLoading(false);
      }
    };
    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [ratingPeriod, ratingBarberId]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8">
          <p className="section-label text-gold mb-2">Satisfacción</p>
          <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium tracking-tight mb-1">
            Valoraciones reales (citas completadas)
          </h2>
          <p className="text-stone-500 text-sm mb-6 max-w-2xl">
            Estrellas 1–5 y comentarios opcionales tras cada cita completada. La misma información se muestra en
            la página de inicio para visitantes.
          </p>
          <AppointmentRatingsPanel
            summary={ratingSummary}
            loading={ratingLoading}
            error={ratingError}
            filtersSlot={
              <div className="flex flex-wrap items-end gap-4 mb-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Periodo</label>
                  <select
                    value={ratingPeriod}
                    onChange={(e) => setRatingPeriod(e.target.value)}
                    className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  >
                    <option value="30">Últimos 30 días</option>
                    <option value="all">Todos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Barbero</label>
                  <select
                    value={ratingBarberId}
                    onChange={(e) => setRatingBarberId(e.target.value)}
                    className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold min-w-[200px]"
                  >
                    <option value="">Todos los barberos</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.first_name} {b.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
