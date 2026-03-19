/**
 * Landing — Diseño profesional e innovador (inspirado en mejores barberías)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import HeroCarousel from '../components/landing/HeroCarousel';
import CortesGallery from '../components/landing/CortesGallery';
import GalleryCarousel3D from '../components/landing/GalleryCarousel3D';
import TestimonialsCarousel from '../components/landing/TestimonialsCarousel';
import * as serviceService from '../services/serviceService';

const SERVICES_FALLBACK = [
  { name: 'Corte', description: 'Corte clásico con terminación profesional', price: 60000, durationMinutes: 35 },
  { name: 'Barba', description: 'Arreglo y perfilado de barba', price: 35000, durationMinutes: 15 },
  { name: 'Corte + Barba', description: 'Combo completo', price: 80000, durationMinutes: 60 },
  { name: 'Barba Premium', description: 'Barba + marcación y cuidado especial', price: 45000, durationMinutes: 30 },
];

const STATS = [
  { value: 'Tradición', label: 'en cada corte' },
  { value: 'Estilo', label: 'a tu medida' },
  { value: 'Detalle', label: 'que nos define' },
];

function formatPrice(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('es-CO')}`;
  return `$${Math.round(n)}`;
}

function formatDuration(min) {
  if (min == null) return '';
  const m = Number(min);
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
  return `${m} min`;
}

export default function HomePage() {
  const { user } = useAuth();
  const { businessName, address, contactPhone, openingHours } = useSettings();
  const canManage = user?.role === 'admin' || user?.role === 'barber';

  const [services, setServices] = useState(SERVICES_FALLBACK);

  useEffect(() => {
    serviceService
      .getServices()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? data?.services) ?? [];
        if (list.length > 0) {
          setServices(
            list.map((s) => ({
              id: s.id,
              name: s.name ?? '',
              description: s.description ?? '',
              price: s.price,
              durationMinutes: s.duration_minutes ?? s.durationMinutes ?? 0,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="font-sans">
      <HeroCarousel />

      {/* ——— SOBRE NOSOTROS ——— */}
      <section className="landing-section bg-stone-50 bg-section-pattern scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="max-w-4xl mx-auto">
            <p className="section-label text-gold text-center">Sobre nosotros</p>
            <h2 className="section-heading text-center mb-6">
              Tradición y tendencia
            </h2>
            <div className="gold-line mx-auto mb-10" />
            <p className="text-stone-600 leading-relaxed text-lg md:text-xl text-center max-w-2xl mx-auto">
              En {businessName} combinamos tradición y tendencia para ofrecerte cortes y barbas de alta calidad.
              Nuestro equipo se asegura de que cada visita sea memorable en un ambiente acogedor.
            </p>
            <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-stone-200/80">
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

      {/* ——— MODELO 3D INTERACTIVO ——— */}
      <section id="experiencia" className="landing-section bg-stone-100 scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="max-w-4xl mx-auto">
            <p className="section-label text-gold text-center">Experiencia</p>
            <h2 className="section-heading text-center mb-4">
              Nuestros cortes
            </h2>
            <div className="gold-line mx-auto mb-6" />
            <p className="text-stone-600 leading-relaxed text-center max-w-xl mx-auto mb-10">
              Explora nuestros estilos más recientes. Arrastra para ver más.
            </p>
            <div className="max-w-3xl mx-auto">
              <CortesGallery />
            </div>
          </div>
        </div>
      </section>

      {/* ——— SERVICIOS (estilo barbería premium) ——— */}
      <section id="servicios" className="landing-section bg-stone-950 text-white scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-14 md:mb-16">
            <p className="section-label text-gold">Servicios</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium text-white tracking-tight mb-4">
              Cortes, barba y más
            </h2>
            <div className="gold-line mx-auto mb-6" />
            <p className="text-stone-400 max-w-xl mx-auto text-lg">
              Precios y duración aproximada. Agenda en línea el servicio que prefieras.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {services.slice(0, 12).map((s, i) => (
              <div
                key={s.id ?? i}
                className="group relative bg-stone-900/80 border border-stone-800 rounded-xl p-6 hover:border-gold/40 hover:bg-stone-900 transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-1 h-0 bg-gold group-hover:h-full transition-all duration-500 ease-out rounded-l-xl" />
                <h3 className="font-serif text-lg md:text-xl text-white font-medium mb-2 pr-6">
                  {s.name}
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

          <div className="text-center mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/appointments"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gold text-barber-dark font-semibold text-sm uppercase tracking-widest hover:bg-gold/90 transition-colors rounded-sm"
            >
              Agendar cita
              <span className="inline-block">→</span>
            </Link>
            {services.length > 12 && (
              <span className="text-stone-500 text-sm">
                + {services.length - 12} servicios más en el agendador
              </span>
            )}
          </div>
        </div>
      </section>

      <GalleryCarousel3D />
      <TestimonialsCarousel />

      {/* ——— UBICACIÓN Y HORARIO ——— */}
      <section id="ubicacion" className="landing-section bg-stone-50 bg-section-pattern scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="section-label text-gold">Visítanos</p>
            <h2 className="section-heading mb-4">Ubicación y horario</h2>
            <div className="gold-line mx-auto mb-6" />
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="landing-card p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <span className="text-xl" aria-hidden>📍</span>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-stone-900 mb-2">Dirección</h3>
                  {address ? (
                    <p className="text-stone-600 leading-relaxed">{address}</p>
                  ) : (
                    <p className="text-stone-400">Próximamente</p>
                  )}
                </div>
              </div>
            </div>
            <div className="landing-card p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <span className="text-xl" aria-hidden>📞</span>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-stone-900 mb-2">Teléfono</h3>
                  {contactPhone ? (
                    <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="text-stone-600 hover:text-gold transition-colors">
                      {contactPhone}
                    </a>
                  ) : (
                    <p className="text-stone-400">Próximamente</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {openingHours && (
            <div className="max-w-4xl mx-auto mt-6">
              <div className="landing-card p-8 md:p-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <span className="text-xl" aria-hidden>🕐</span>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-stone-900 mb-2">Horario</h3>
                  <p className="text-stone-600 leading-relaxed whitespace-pre-line">{openingHours}</p>
                </div>
              </div>
            </div>
          )}
          <div className="max-w-4xl mx-auto mt-8">
            <div className="rounded-xl overflow-hidden border border-stone-200 shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.7547818832513!2d-75.57277465356252!3d6.163586117476545!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4683aac95815a1%3A0xb0618dd527586c70!2sCl.%2036d%20Sur%20%2327A-105%2C%20Quintas%20de%20La%20Serrania%2C%20Envigado%2C%20Antioquia!5e0!3m2!1ses!2sco!4v1773809053737!5m2!1ses!2sco"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación de Mr. Kutz"
              />
            </div>
          </div>
        </div>
      </section>
      

      {/* ——— CTA FINAL ——— */}
      <section className="landing-section bg-barber-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-section-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-40" />
        <div className="container mx-auto px-6 sm:px-8 text-center relative z-10">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-6 tracking-tight">
            ¿Listo para tu próximo corte?
          </h2>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-stone-400 mb-12 max-w-lg mx-auto text-lg md:text-xl">
            Agenda en línea en segundos. Elige fecha, barbero y servicio.
          </p>
          <Link to="/appointments" className="btn-primary">
            Agenda tu cita ahora
            <span className="inline-block ml-1" aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {canManage && (
        <section className="py-8 bg-stone-100 border-t border-stone-200">
          <div className="container mx-auto px-6 sm:px-8">
            <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">Panel</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className="px-4 py-2.5 bg-barber-dark text-white text-sm font-medium rounded-xl hover:bg-barber-charcoal transition-colors">
                Dashboard
              </Link>
              <Link to="/appointments" className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors">
                Citas
              </Link>
              <Link to="/clients" className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors">
                Clientes
              </Link>
              <Link to="/services" className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors">
                Servicios
              </Link>
              <Link to="/barbers" className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors">
                Barberos
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
