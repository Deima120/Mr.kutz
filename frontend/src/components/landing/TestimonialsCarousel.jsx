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
    <blockquote
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt('')}
      className="relative bg-white p-8 sm:p-10 border border-stone-200 rounded-2xl shadow-card hover:shadow-card-hover hover:border-gold/20 transition-shadow duration-300"
      style={{
        transform: tilt || 'perspective(600px) rotateX(0) rotateY(0)',
        transition: tilt ? 'transform 0.1s ease-out' : 'transform 0.35s ease-out',
      }}
    >
      <span className="absolute top-6 left-6 font-serif text-gold/30 text-4xl leading-none">"</span>
      <p className="text-stone-600 italic leading-relaxed pl-6 mb-6 min-h-[4rem]">
        {item.text}
      </p>
      <footer className="pl-6 border-l-2 border-gold">
        <cite className="not-italic font-semibold text-stone-900">{item.name}</cite>
        <span className="block text-stone-500 text-sm font-normal">{item.role}</span>
      </footer>
    </blockquote>
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
      <section id="testimonios" className="py-24 sm:py-32 bg-white scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-14">
            <p className="section-label text-gold">Testimonios</p>
            <h2 className="section-heading mb-4">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="max-w-2xl mx-auto py-12 text-stone-500">Cargando...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonios" className="py-24 sm:py-32 bg-white scroll-mt-20">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="text-center mb-14">
          <p className="section-label text-gold">Testimonios</p>
          <h2 className="section-heading mb-4">Lo que dicen nuestros clientes</h2>
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
