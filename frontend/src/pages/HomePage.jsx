/**
 * Landing — Carruseles 3D, hero con imágenes, galería y testimonios
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import HeroCarousel from '../components/landing/HeroCarousel';
import GalleryCarousel3D from '../components/landing/GalleryCarousel3D';
import TestimonialsCarousel from '../components/landing/TestimonialsCarousel';
import * as serviceService from '../services/serviceService';

const SERVICES_FALLBACK = [
  { title: 'Corte', desc: 'Clásico y moderno. El estilo que buscas con la precisión que nos define.', num: '01' },
  { title: 'Barba', desc: 'Perfilado, arreglo y cuidado profesional para tu barba.', num: '02' },
  { title: 'Corte + Barba', desc: 'Combo completo. Sal siempre impecable.', num: '03' },
  { title: 'Servicios especiales', desc: 'Diseños, tintura y tratamientos a tu medida.', num: '04' },
];

export default function HomePage() {
  const { user } = useAuth();
  const { businessName } = useSettings();
  const canManage = user?.role === 'admin' || user?.role === 'barber';

  const [services, setServices] = useState(SERVICES_FALLBACK);

  useEffect(() => {
    serviceService
      .getServices()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.services) ?? [];
        if (list.length > 0) {
          setServices(
            list.map((s, i) => ({
              id: s.id,
              title: s.name ?? s.title ?? '',
              desc: s.description ?? s.desc ?? '',
              num: String(i + 1).padStart(2, '0'),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="font-sans">
      {/* ——— HERO CON CARRUSEL DE IMÁGENES ——— */}
      <HeroCarousel />

      {/* ——— SOBRE NOSOTROS ——— */}
      <section className="py-24 sm:py-32 bg-stone-50 scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="section-label text-gold">Sobre nosotros</p>
            <h2 className="section-heading mb-6">
              Tradición y tendencia
            </h2>
            <div className="w-14 h-px bg-gold mx-auto mb-8" />
            <p className="text-stone-600 leading-relaxed text-lg">
              En {businessName} combinamos tradición y tendencia para ofrecerte cortes y barbas de alta calidad.
              Nuestro equipo se asegura de que cada visita sea memorable en un ambiente acogedor.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 pt-12 border-t border-stone-300/70">
              {STATS.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="font-serif text-2xl md:text-3xl text-gold font-medium mb-1">{stat.value}</p>
                  <p className="text-stone-500 text-sm uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ——— SERVICIOS ——— */}
      <section id="servicios" className="py-24 sm:py-32 bg-white scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <p className="section-label text-gold">Servicios</p>
            <h2 className="section-heading mb-4">Lo que hacemos</h2>
            <p className="text-stone-500 max-w-md mx-auto">
              Cortes, barba y servicios especiales para que luzcas como quieres.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 rounded-lg overflow-hidden">
            {services.map((s, i) => (
              <div
                key={s.id ?? s.num ?? i}
                className="bg-white p-8 sm:p-10 hover:bg-stone-50/80 transition-all duration-300 group border border-stone-200 hover:border-gold/30 hover:shadow-card-hover"
              >
                <span className="block font-serif text-gold text-2xl mb-4 font-medium tabular-nums">
                  {s.num}
                </span>
                <h3 className="font-serif text-xl text-stone-900 font-medium mb-2 group-hover:text-gold transition-colors duration-300">
                  {s.title}
                </h3>
                {s.description && (
                  <p className="text-stone-500 text-sm leading-snug mb-4 line-clamp-2">
                    {s.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-gold font-semibold tabular-nums">
                    {formatPrice(s.price)}
                  </span>
                  {s.durationMinutes > 0 && (
                    <span className="text-stone-500 text-xs uppercase tracking-wider">
                      {formatDuration(s.durationMinutes)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/appointments"
              className="inline-flex items-center gap-2 text-stone-700 font-semibold text-sm tracking-wide hover:text-gold transition-colors duration-300 group"
            >
              Ver disponibilidad y agendar
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
            {services.length > 12 && (
              <span className="text-stone-500 text-sm">
                + {services.length - 12} servicios más en el agendador
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ——— GALERÍA 3D (carrusel con tilt) ——— */}
      <GalleryCarousel3D />

      {/* ——— TESTIMONIOS (carrusel 3D) ——— */}
      <TestimonialsCarousel />

      {/* ——— UBICACIÓN ——— */}
      <section id="ubicacion" className="py-24 sm:py-32 bg-stone-50 scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="section-label text-gold">Ubicación</p>
            <h2 className="section-heading mb-4">Visítanos</h2>
            <p className="text-stone-500 max-w-md mx-auto">
              Próximamente: dirección y mapa.
            </p>
          </div>
          <div className="max-w-3xl mx-auto aspect-video bg-stone-200 border border-stone-200 rounded-lg flex items-center justify-center">
            <p className="font-serif text-stone-500">Mapa próximamente</p>
          </div>
        </div>
      </section>

      {/* ——— CTA FINAL ——— */}
      <section className="py-24 sm:py-32 bg-barber-dark text-white">
        <div className="container mx-auto px-6 sm:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial-gold opacity-50" />
          <div className="relative z-10">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium mb-4">
              ¿Listo para tu próximo corte?
            </h2>
            <div className="w-14 h-px bg-gold mx-auto mb-6" />
            <p className="text-stone-400 mb-10 max-w-md mx-auto text-lg">
              Agenda en línea en segundos. Elige fecha, barbero y servicio.
            </p>
            <Link to="/appointments" className="btn-primary">
              Agenda tu cita ahora
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Acceso rápido staff (discreto) */}
      {canManage && (
        <section className="py-6 bg-stone-100 border-t border-stone-200">
          <div className="container mx-auto px-6 sm:px-8">
            <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">Panel</p>
            <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">Panel</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className="px-4 py-2 bg-barber-dark text-white text-sm font-medium rounded-lg hover:bg-barber-charcoal transition-colors">
                Dashboard
              </Link>
              <Link to="/appointments" className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors">
                Citas
              </Link>
              <Link to="/clients" className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors">
                Clientes
              </Link>
              <Link to="/services" className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors">
                Servicios
              </Link>
              <Link to="/barbers" className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors">
                Barberos
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="fixed bottom-5 right-5 z-40">
        <Link
          to="/appointments/new"
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full bg-gold text-barber-dark font-semibold shadow-[0_14px_32px_rgba(0,0,0,0.28)] hover:bg-gold-light transition-colors"
        >
          Reservar ahora
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
