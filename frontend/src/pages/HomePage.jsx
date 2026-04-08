/**
 * Landing — Diseño profesional e innovador (inspirado en mejores barberías)
 */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import HeroCarousel from '../components/landing/HeroCarousel';
import * as serviceService from '../services/serviceService';

const GalleryCarousel3D = lazy(() => import('../components/landing/GalleryCarousel3D'));
const LandingSatisfactionSection = lazy(() => import('../components/landing/LandingSatisfactionSection'));
const CortesGallery = lazy(() => import('../components/landing/CortesGallery'));

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

const SERVICE_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'cortes', label: 'Cortes' },
  { id: 'depilaciones', label: 'Depilaciones' },
  { id: 'limpieza-facial', label: 'Limpieza facial' },
  { id: 'tinturas', label: 'Tinturas' },
];

const CATEGORY_META = {
  cortes: { label: 'Cortes', icon: 'scissors', accent: 'from-gold/25 to-transparent' },
  depilaciones: { label: 'Depilaciones', icon: 'spark', accent: 'from-sky-400/20 to-transparent' },
  'limpieza-facial': { label: 'Limpieza facial', icon: 'drop', accent: 'from-emerald-400/20 to-transparent' },
  tinturas: { label: 'Tinturas', icon: 'palette', accent: 'from-violet-400/20 to-transparent' },
};

function CategoryIcon({ name }) {
  const baseClass = 'h-3.5 w-3.5';
  if (name === 'scissors') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass} aria-hidden>
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="6.5" cy="17.5" r="2.5" />
        <path d="M20 4L8.4 11.2M20 20L8.4 12.8" />
      </svg>
    );
  }
  if (name === 'spark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass} aria-hidden>
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      </svg>
    );
  }
  if (name === 'drop') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass} aria-hidden>
        <path d="M12 3c2.6 3.4 6 7 6 10a6 6 0 1 1-12 0c0-3 3.4-6.6 6-10z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={baseClass} aria-hidden>
      <path d="M12 3l2 4.5L19 9l-3.6 3.2.9 4.8L12 14.8 7.7 17l.9-4.8L5 9l5-1.5L12 3z" />
    </svg>
  );
}

function inferServiceCategory(service = {}) {
  const apiCat = (service.categoryName || service.category || '').toLowerCase();
  if (/(tint|tintur|color|decolor)/.test(apiCat)) return 'tinturas';
  if (/(depil)/.test(apiCat)) return 'depilaciones';
  if (/(facial|limpieza)/.test(apiCat)) return 'limpieza-facial';
  if (/(corte|barba|combo|general)/.test(apiCat)) return 'cortes';

  const text = `${service?.name ?? ''} ${service?.description ?? ''}`.toLowerCase();
  if (/(tint|color|decolor)/.test(text)) return 'tinturas';
  if (/(depil|ceja|nariz|oreja|hilo|cera)/.test(text)) return 'depilaciones';
  if (/(facial|limpieza|mascar|exfoli|piel)/.test(text)) return 'limpieza-facial';
  return 'cortes';
}

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
  if (Number.isNaN(m) || m <= 0) return '';
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
  return `${m} min`;
}

function LandingBlockFallback({ text = 'Cargando...' }) {
  return (
    <div className="max-w-6xl mx-auto rounded-2xl border border-stone-200 bg-white/80 p-8 text-center text-stone-500">
      {text}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { businessName, address, openingHours } = useSettings();
  const canManage = user?.role === 'admin' || user?.role === 'barber';
  const locationAddress = (address || '').trim();
  const mapSrc = locationAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(locationAddress)}&output=embed`
    : '';
  const mapLink = locationAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`
    : '';

  const [services, setServices] = useState(SERVICES_FALLBACK);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);
  const [shouldLoadCortesGallery, setShouldLoadCortesGallery] = useState(false);
  const cortesGalleryTriggerRef = useRef(null);

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
              categoryName: s.category_name ?? s.categoryName ?? '',
              price: s.price,
              durationMinutes: s.duration_minutes ?? s.durationMinutes ?? 0,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIsFilterTransitioning(true);
    const t = setTimeout(() => setIsFilterTransitioning(false), 220);
    return () => clearTimeout(t);
  }, [activeCategory]);

  useEffect(() => {
    const target = cortesGalleryTriggerRef.current;
    if (!target || shouldLoadCortesGallery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadCortesGallery(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldLoadCortesGallery]);

  const servicesWithCategory = services.map((s) => ({
    ...s,
    category: inferServiceCategory(s),
  }));

  const filteredServices = servicesWithCategory.filter((s) =>
    activeCategory === 'all' ? true : s.category === activeCategory
  );

  const isClient = user?.role === 'client';

  return (
    <div className="font-sans">
      <HeroCarousel />
      <div className="relative h-8 sm:h-10 bg-transparent overflow-hidden">
        <div className="absolute inset-0 -skew-y-2 origin-top-left bg-stone-950/95" />
      </div>

      {isClient && (
        <section className="py-8 bg-white border-b border-stone-200/80">
          <div className="container mx-auto px-6 sm:px-8">
            <div className="max-w-5xl mx-auto rounded-2xl border border-stone-200 bg-gradient-to-r from-white via-stone-50 to-white p-5 sm:p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs tracking-widest text-gold font-semibold">Tu espacio</p>
                  <h2 className="font-serif text-2xl text-stone-900 font-medium">
                    Hola, {(user?.firstName || 'cliente').trim()}
                  </h2>
                  <p className="text-stone-600 text-sm mt-1">
                    Gestiona tu perfil, revisa tus citas y agenda en segundos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/profile" className="btn-outline py-2.5">
                    Ver perfil
                  </Link>
                  <Link to="/appointments" className="btn-dark py-2.5">
                    Mis citas
                  </Link>
                  <Link to="/appointments/new" className="btn-admin py-2.5">
                    Agendar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="relative h-8 sm:h-10 bg-transparent overflow-hidden">
        <div className="absolute inset-0 -skew-y-2 origin-top-right bg-stone-100" />
      </div>

      {/* ——— SOBRE NOSOTROS ——— */}
      <section className="landing-section bg-stone-100 text-stone-900 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-section-pattern opacity-60" />
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-15" />
        <div className="container mx-auto px-6 sm:px-8 relative z-10 opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:120ms]">
          <div className="max-w-4xl mx-auto">
            <p className="section-label text-gold text-center">Sobre nosotros</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-stone-900 font-medium tracking-tight leading-[1.1] text-center mb-6">
              Tradición y tendencia
            </h2>
            <div className="gold-line mx-auto mb-10" />
            <p className="text-stone-600 leading-relaxed text-lg md:text-xl text-center max-w-2xl mx-auto">
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

      {/* ——— SERVICIOS (estilo barbería premium) ——— */}
      <section id="servicios" className="landing-section bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-section-pattern opacity-20" />
        <div className="container mx-auto px-6 sm:px-8 relative z-10 opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:140ms]">
          <div className="text-center mb-14 md:mb-16">
            <p className="section-label text-gold">Servicios</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium text-white tracking-tight mb-4">
              Cortes, barba y más
            </h2>
            <div className="gold-line mx-auto mb-6" />
            <p className="text-stone-400 max-w-xl mx-auto text-lg">
              Precios y duración aproximada. Agenda en línea el servicio que prefieras.
            </p>
            <div className="max-w-3xl mx-auto mt-8" ref={cortesGalleryTriggerRef}>
              {shouldLoadCortesGallery ? (
                <Suspense fallback={<LandingBlockFallback text="Cargando galería..." />}>
                  <CortesGallery />
                </Suspense>
              ) : (
                <LandingBlockFallback text="Desliza para cargar galería..." />
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-10">
            {SERVICE_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 text-xs md:text-sm uppercase tracking-widest transition-all rounded-sm border ${
                    isActive
                      ? 'bg-gold text-barber-dark border-gold'
                      : 'bg-transparent text-stone-300 border-stone-700 hover:border-gold/60 hover:text-gold'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div
            className={`grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto transition-opacity duration-200 ${
              isFilterTransitioning ? 'opacity-70' : 'opacity-100'
            }`}
          >
            {filteredServices.slice(0, 12).map((s, i) => (
              <div
                key={s.id ?? i}
                className="group relative bg-stone-900/80 border border-stone-800 rounded-xl p-6 hover:border-gold/40 hover:bg-stone-900 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.38)] transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${CATEGORY_META[s.category]?.accent ?? 'from-gold/20 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
                <div className="absolute top-0 left-0 w-1 h-0 bg-gold group-hover:h-full transition-all duration-500 ease-out rounded-l-xl" />
                <div className="relative z-10 inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-stone-700 bg-stone-950/80 text-[10px] uppercase tracking-widest text-stone-300 mb-3">
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded bg-stone-800 border border-stone-700 text-gold">
                    <CategoryIcon name={CATEGORY_META[s.category]?.icon} />
                  </span>
                  <span>{s.categoryName || CATEGORY_META[s.category]?.label || 'Servicio'}</span>
                </div>
                <h3 className="font-serif text-lg md:text-xl text-white font-medium mb-2 pr-6">{s.name}</h3>
                {s.description && (
                  <p className="text-stone-500 text-sm leading-snug mb-4 line-clamp-2">{s.description}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-gold font-semibold tabular-nums">{formatPrice(s.price)}</span>
                  {s.durationMinutes > 0 && (
                    <span className="text-stone-500 text-xs uppercase tracking-wider">
                      {formatDuration(s.durationMinutes)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="max-w-2xl mx-auto text-center mt-8 rounded-xl border border-stone-800 bg-stone-900/60 p-6">
              <p className="text-stone-300">
                No hay servicios en esta categoría por ahora. Prueba con otra opción.
              </p>
            </div>
          )}

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

      <Suspense fallback={<LandingBlockFallback text="Cargando sección de ambiente..." />}>
        <GalleryCarousel3D />
      </Suspense>
      <Suspense fallback={<LandingBlockFallback text="Cargando satisfacción..." />}>
        <LandingSatisfactionSection />
      </Suspense>

      {/* ——— UBICACIÓN Y HORARIO ——— */}
      <section id="ubicacion" className="landing-section bg-stone-100 text-stone-900 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-section-pattern opacity-55" />
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-10" />
        <div className="container mx-auto px-6 sm:px-8 relative z-10 opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:160ms]">
          <div className="text-center mb-12">
            <p className="section-label text-gold">Visítanos</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-stone-900 font-medium tracking-tight mb-4">
              Ubicación y horario
            </h2>
            <div className="gold-line mx-auto mb-6" />
            {openingHours && (
              <p className="text-stone-600 max-w-2xl mx-auto text-base leading-relaxed mb-4">{openingHours}</p>
            )}
          </div>
          {locationAddress ? (
            <div className="max-w-4xl mx-auto mt-6">
              <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_18px_50px_rgba(20,20,20,0.18)]">
                <div className="aspect-[16/8] w-full bg-stone-100">
                  <iframe
                    title="Mapa de ubicación Mr. Kutz"
                    src={mapSrc}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200">
                  <p className="text-sm text-stone-600">Ubicación: {locationAddress}</p>
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold hover:text-barber-dark transition-colors rounded-sm"
                  >
                    Abrir en Google Maps
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto aspect-video bg-stone-200 border border-stone-200 rounded-lg flex items-center justify-center">
              <p className="font-serif text-stone-500">Configura la dirección en ajustes para ver el mapa</p>
            </div>
          )}
        </div>
      </section>

      {/* ——— CTA FINAL ——— */}
      <section className="landing-section bg-barber-dark text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-section-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-40" />
        <div className="container mx-auto px-6 sm:px-8 text-center relative z-10 opacity-0 animate-fade-in-up [animation-fill-mode:forwards] [animation-delay:180ms]">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-6 tracking-tight">
            ¿Listo para tu próximo corte?
          </h2>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-stone-400 mb-12 max-w-lg mx-auto text-lg md:text-xl">
            Agenda en línea en segundos. Elige fecha, barbero y servicio.
          </p>
          <Link to="/appointments" className="btn-primary">
            Agenda tu cita ahora
            <span className="inline-block ml-1" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </section>

      {canManage && (
        <section className="py-8 bg-stone-100 border-t border-stone-200">
          <div className="container mx-auto px-6 sm:px-8">
            <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">Panel</p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className="px-4 py-2.5 bg-barber-dark text-white text-sm font-medium rounded-xl hover:bg-barber-charcoal transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/appointments"
                className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors"
              >
                Citas
              </Link>
              <Link
                to="/clients"
                className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors"
              >
                Clientes
              </Link>
              <Link
                to="/services"
                className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors"
              >
                Servicios
              </Link>
              <Link
                to="/barbers"
                className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 text-sm font-medium rounded-xl hover:border-gold hover:text-gold transition-colors"
              >
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
