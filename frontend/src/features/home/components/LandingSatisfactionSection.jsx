/**
 * Satisfacción en la landing: mismos datos que el panel admin (valoraciones de citas
 * completadas), pero mostrados como carrusel — hasta 5 comentarios elegidos al azar
 * en cada carga, en vez de la lista completa que usa el panel admin.
 */

import { useEffect, useMemo, useState } from 'react';
import { Quote } from 'lucide-react';
import Carousel3D from '@/features/home/components/Carousel3D';
import RatingStars from '@/shared/components/admin/RatingStars';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

const MAX_TESTIMONIALS = 5;

function formatRatedDate(d) {
  if (!d) return '';
  return formatDisplayDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Selección aleatoria sin repetir, tope `max` — Fisher-Yates parcial. */
function pickRandom(list, max) {
  const pool = [...list];
  const picked = [];
  while (pool.length > 0 && picked.length < max) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

function TestimonialCard({ item }) {
  const meta = [item.serviceName, item.barberName, formatRatedDate(item.date)]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="w-full max-w-2xl mx-auto rounded-[1.35rem] p-[1px] bg-gradient-to-br from-gold/70 via-stone-200 to-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
      <div className="relative rounded-[1.3rem] bg-white p-6 sm:p-10 text-center">
        <Quote className="w-8 h-8 mx-auto mb-4 text-gold/70 fill-gold/10" strokeWidth={1.5} aria-hidden />
        <RatingStars value={item.rating} sizeClass="w-4 h-4" gapClass="gap-1" className="justify-center mb-4" />
        <p className="font-serif text-lg sm:text-xl text-stone-800 leading-relaxed italic mb-5 text-balance">
          "{item.comment}"
        </p>
        <p className="font-semibold text-stone-900">{item.clientName}</p>
        {meta ? <p className="text-stone-500 text-xs mt-0.5">{meta}</p> : null}
      </div>
    </div>
  );
}

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

  // Al azar una sola vez por carga de datos, no en cada render — si no, el carrusel
  // "saltaría" de testimonio con cualquier estado que dispare un re-render.
  const testimonials = useMemo(() => {
    const withComment = (summary?.recent || []).filter((r) => String(r.comment || '').trim());
    return pickRandom(withComment, MAX_TESTIMONIALS);
  }, [summary]);

  const body = (() => {
    if (loading) {
      return <div className="py-10 text-center text-stone-500 text-sm">Cargando valoraciones…</div>;
    }
    if (error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm max-w-xl mx-auto" role="alert">
          {error}
        </div>
      );
    }
    if (testimonials.length === 0) {
      return (
        <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 max-w-xl mx-auto">
          <p className="text-stone-600 text-sm">
            Aún no hay valoraciones públicas. Cuando los clientes valoren sus citas, aparecerán aquí.
          </p>
        </div>
      );
    }
    return (
      <Carousel3D
        items={testimonials}
        autoPlayMs={5000}
        showDots
        showArrows={testimonials.length > 1}
        ariaLabel="Comentarios de clientes"
        renderSlide={(item) => <TestimonialCard item={item} />}
      />
    );
  })();

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
        {body}
      </div>
    </section>
  );
}
