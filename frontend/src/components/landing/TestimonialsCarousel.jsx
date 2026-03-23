/**
 * Carrusel de testimonios con tarjetas 3D
 * Carga desde API (solo activos); fallback a lista por defecto si falla o está vacía.
 */

import { useState, useEffect, useRef } from 'react';
import Carousel3D from './Carousel3D';
import * as testimonialService from '../../services/testimonialService';

const DEFAULT_ITEMS = [
  { name: 'Andrés M.', text: 'El barbero entendió exactamente lo que quería. Ambiente acogedor y servicio impecable. Volveré.', role: 'Cliente' },
  { name: 'Cristian G.', text: 'Muy contento con el arreglo de barba. Profesional y atento. Muy recomendado.', role: 'Cliente' },
  { name: 'Adrián L.', text: 'Experiencia de lujo: buen trato y resultado excelente. Gracias por el servicio.', role: 'Cliente' },
  { name: 'Marcos R.', text: 'La mejor barbería de la zona. Siempre salgo satisfecho con el corte.', role: 'Cliente' },
];

function TestimonialCard({ item, isActive }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState('');

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = Math.max(-8, Math.min(8, -y * 8));
    const rotateY = Math.max(-8, Math.min(8, x * 8));
    setTilt(`perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  return (
    <div
      className={`relative rounded-[1.35rem] p-[1px] bg-gradient-to-br from-gold/70 via-stone-200 to-gold/30 transition-all duration-500 ${
        isActive ? 'shadow-[0_24px_60px_rgba(0,0,0,0.18)]' : 'shadow-[0_14px_36px_rgba(0,0,0,0.12)]'
      }`}
    >
      <blockquote
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt('')}
        className="relative rounded-[1.3rem] bg-white/90 backdrop-blur-sm p-8 sm:p-10 border border-white/80 transition-all duration-300"
        style={{
          transform: tilt || `perspective(600px) rotateX(0) rotateY(0) scale(${isActive ? 1 : 0.985})`,
          transition: tilt ? 'transform 0.1s ease-out' : 'transform 0.35s ease-out',
        }}
      >
        <div className="absolute inset-0 rounded-[1.3rem] bg-gradient-to-br from-gold/10 via-transparent to-transparent pointer-events-none" />
        <span className="absolute top-5 right-6 font-serif text-gold/20 text-6xl leading-none select-none">"</span>
        <p className="text-stone-600 italic leading-relaxed pr-10 mb-8 min-h-[4rem] text-base md:text-lg relative z-10">
          {item.text}
        </p>
        <footer className="relative z-10 flex items-center gap-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-gold text-sm font-semibold tracking-wide">
            {(item.name || 'C').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <cite className="not-italic font-semibold text-stone-900 block truncate">{item.name}</cite>
            <span className="text-stone-500 text-sm font-normal">{item.role}</span>
          </div>
          <span className="w-10 h-px bg-gold/70 shrink-0 ml-auto" />
        </footer>
      </blockquote>
    </div>
  );
}

export default function TestimonialsCarousel() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testimonialService
      .getTestimonials()
      .then((data) => {
        const raw = data?.data ?? data;
        const list = Array.isArray(raw) ? raw : (data?.testimonials ?? []);
        if (list.length > 0) {
          setItems(
            list.map((t) => ({
              name: t.author_name ?? t.authorName ?? '',
              text: t.content ?? '',
              role: t.author_role ?? t.authorRole ?? 'Cliente',
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayItems = items.length > 0 ? items : DEFAULT_ITEMS;

  if (loading) {
    return (
      <section id="testimonios" className="landing-section bg-stone-100 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-section-pattern opacity-50" />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 w-64 h-64 rounded-full bg-stone-400/10 blur-3xl" />
        <div className="container mx-auto px-6 sm:px-8 relative z-10">
          <div className="text-center mb-14">
            <p className="section-label text-gold">Testimonios</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-stone-900 font-medium tracking-tight mb-4">Lo que dicen nuestros clientes</h2>
            <div className="gold-line mx-auto mb-6" />
          </div>
          <div className="max-w-2xl mx-auto py-12 text-stone-500">Cargando...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonios" className="landing-section bg-stone-100 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-section-pattern opacity-50" />
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-16 w-64 h-64 rounded-full bg-stone-400/10 blur-3xl" />
      <div className="container mx-auto px-6 sm:px-8 relative z-10">
        <div className="text-center mb-14 md:mb-16">
          <p className="section-label text-gold">Testimonios</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-stone-900 font-medium tracking-tight mb-4">Lo que dicen nuestros clientes</h2>
          <div className="gold-line mx-auto mb-6" />
          <p className="text-stone-500 max-w-lg mx-auto text-lg">
            La opinión de quienes nos eligen.
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <Carousel3D
            items={displayItems}
            autoPlayMs={6000}
            showDots
            showArrows
            ariaLabel="Testimonios"
            renderSlide={(item, isActive) => <TestimonialCard item={item} isActive={isActive} />}
          />
        </div>
      </div>
    </section>
  );
}
