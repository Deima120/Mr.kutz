/**
 * Hero editorial — full-bleed, tipografía fuerte, CTA claro
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&q=80',
    title: 'Estilo y precisión en cada corte',
    subtitle: 'Cortes clásicos, barba y servicios de barbería con la calidad que te mereces.',
  },
  {
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1920&q=80',
    title: 'Ambiente de tradición',
    subtitle: 'Un espacio pensado para que te sientas como en casa.',
  },
  {
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=80',
    title: 'Detalle en cada gesto',
    subtitle: 'Nuestro equipo cuida cada detalle para que salgas impecable.',
  },
];

export default function HeroCarousel() {
  const { isAuthenticated } = useAuth();
  const { businessName } = useSettings();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-barber-dark" aria-label="Hero">
      {/* Imagen de fondo con transición suave */}
      <div className="absolute inset-0">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[1000ms] ease-out"
            style={{
              opacity: i === current ? 1 : 0,
              zIndex: i === current ? 2 : 1,
            }}
          >
            <img
              src={slide.image}
              alt=""
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-barber-dark/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-barber-dark/60 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Contenido: z-20 para que siempre quede por encima de indicadores y fondo */}
      <div className="container mx-auto px-6 sm:px-8 py-20 relative z-20 flex flex-col items-center justify-center min-h-screen text-center">
        <p
          className="section-label text-gold mb-6 opacity-0 animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          {businessName}
        </p>

        <div className="max-w-4xl mx-auto w-full shrink-0" key={current}>
          <h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium text-white leading-[1.05] tracking-tight mb-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            {HERO_SLIDES[current].title}
          </h1>
          <div
            className="gold-line mx-auto mb-8 opacity-0 animate-line-expand origin-center"
            style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
          />
          <p
            className="text-stone-300 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
          >
            {HERO_SLIDES[current].subtitle}
          </p>
        </div>

        {/* CTAs: z-index propio para que nada se monte encima */}
        <div
          className="relative z-10 flex flex-wrap justify-center gap-4 mt-16 shrink-0 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}
        >
          <Link to="/appointments" className="btn-primary group">
            Agendar cita
            <span className="group-hover:translate-x-1 transition-transform inline-block ml-0.5" aria-hidden>→</span>
          </Link>
          {!isAuthenticated && (
            <Link to="/register" className="btn-secondary">
              Crear cuenta
            </Link>
          )}
        </div>
      </div>

      {/* Indicadores y scroll: z-0 para que queden detrás del contenido y no encima de los botones */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-0 flex flex-col items-center gap-6">
        <div className="flex gap-2.5">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-10 h-1.5 bg-gold' : 'w-6 h-1.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Ir a slide ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Scroll</span>
        <span className="block w-px h-10 bg-gradient-to-b from-stone-500 to-transparent animate-float" />
      </div>
    </section>
  );
}
