/**
 * Satisfacción en la landing: mismos datos que el panel admin (valoraciones de citas completadas).
 */

import { useEffect, useState } from 'react';
import AppointmentRatingsPanel from '../admin/AppointmentRatingsPanel';
import * as appointmentService from '../../services/appointmentService';

export default function LandingSatisfactionSection() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await appointmentService.getPublicAppointmentSatisfaction({ limit: 24 });
        if (!cancelled) setSummary(data && typeof data === 'object' ? data : null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudieron cargar las valoraciones.');
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="satisfaccion" className="landing-section bg-white text-stone-900 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-section-pattern opacity-40" />
      <div className="container mx-auto px-6 sm:px-8 relative z-10">
        <div className="text-center mb-10 md:mb-12">
          <p className="section-label text-gold">Satisfacción</p>
          <h2 className="section-heading mb-4">Lo que valoran nuestros clientes</h2>
          <div className="gold-line mx-auto mb-4" />
          <p className="text-stone-600 max-w-xl mx-auto text-base">
            Comentarios y valoraciones de clientes tras sus citas.
          </p>
        </div>
        <div className="max-w-3xl mx-auto panel-card p-6 sm:p-8 md:p-10">
          <AppointmentRatingsPanel
            summary={summary}
            loading={loading}
            error={error}
            commentsOnly
            emptyHint="Aún no hay valoraciones públicas. Cuando los clientes valoren sus citas, aparecerán aquí."
          />
        </div>
      </div>
    </section>
  );
}
