/**
 * Hero con carrusel de imágenes 3D y overlay de texto
 * Imágenes de barbería con efecto parallax/depth
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
    const t = setInterval(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-barber-dark">
      {/* Carrusel de fondos con efecto 3D/parallax */}
      <div className="absolute inset-0" style={{ perspective: '1200px' }}>
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000 ease-out"
            style={{
              opacity: i === current ? 1 : 0,
              zIndex: i === current ? 2 : 1,
            }}
          >
            <div
              className="absolute inset-0 scale-110"
              style={{
                transform: `translateZ(-80px) scale(1.15)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src={slide.image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            {/* Overlay más oscuro para que el texto no compita con reflejos y luces */}
            <div className="absolute inset-0 bg-barber-dark/75" />
            <div className="absolute inset-0 bg-gradient-to-b from-barber-dark/60 via-transparent to-barber-dark/80" />
          </div>
        ))}
      </div>

      {/* Contenido central: bloque de texto sobre base oscura para buena legibilidad */}
      <div className="container mx-auto px-6 sm:px-8 py-20 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
        <div className="max-w-3xl mx-auto text-center text-white">
          <p className="section-label text-gold mb-6 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            {businessName}
          </p>
          {/* Base oscura detrás del texto para que no se pierda con la imagen */}
          <div className="relative rounded-2xl bg-barber-dark/90 backdrop-blur-sm px-8 sm:px-12 py-10 sm:py-14 border border-white/10 shadow-2xl min-h-[280px] flex flex-col items-center justify-center">
            <div className="w-full" key={current}>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.08] tracking-tight mb-6 text-white">
                {HERO_SLIDES[current].title}
              </h1>
              <p className="text-stone-200 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-8">
                {HERO_SLIDES[current].subtitle}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link to="/appointments" className="btn-primary group">
                Agenda tu cita
                <span className="group-hover:translate-x-0.5 transition-transform" aria-hidden>→</span>
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="btn-secondary border-white/40 text-white hover:bg-white/15 hover:border-white/60">
                  Regístrate
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores del carrusel */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-gold' : 'w-4 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-xs uppercase tracking-widest text-stone-500">Descubre más</span>
        <span className="block w-px h-8 bg-gradient-to-b from-stone-500 to-transparent" />
      </div>
    </section>
  );
}
