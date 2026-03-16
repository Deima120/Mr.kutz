/**
 * Landing — Diseño premium inspirado en las mejores barberías
 * Hero impactante, servicios, galería, testimonios, CTA
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const services = [
  { title: 'Corte', desc: 'Clásico y moderno. El estilo que buscas con la precisión que nos define.', num: '01' },
  { title: 'Barba', desc: 'Perfilado, arreglo y cuidado profesional para tu barba.', num: '02' },
  { title: 'Corte + Barba', desc: 'Combo completo. Sal siempre impecable.', num: '03' },
  { title: 'Servicios especiales', desc: 'Diseños, tintura y tratamientos a tu medida.', num: '04' },
];

const testimonials = [
  { name: 'Andrés M.', text: 'El barbero entendió exactamente lo que quería. Ambiente acogedor y servicio impecable. Volveré.', role: 'Cliente' },
  { name: 'Cristian G.', text: 'Muy contento con el arreglo de barba. Profesional y atento. Muy recomendado.', role: 'Cliente' },
  { name: 'Adrián L.', text: 'Experiencia de lujo: buen trato y resultado excelente. Gracias por el servicio.', role: 'Cliente' },
];

const galleryPlaceholder = [
  { label: 'Ambiente' },
  { label: 'Detalle' },
  { label: 'Estilo' },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { businessName } = useSettings();
  const canManage = user?.role === 'admin' || user?.role === 'barber';

  return (
    <div className="font-sans">
      {/* ——— HERO ——— */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-barber-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial-gold" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(12,10,9,0.4)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        <div className="container mx-auto px-6 sm:px-8 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-label text-gold mb-6 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              {businessName}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.08] tracking-tight mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              Estilo y precisión en cada corte
            </h1>
            <p className="text-stone-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10 animate-fade-in-up opacity-0" style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}>
              Cortes clásicos, barba y servicios de barbería con la calidad que te mereces.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
              <Link to="/appointments" className="btn-primary group">
                Agenda tu cita
                <span className="group-hover:translate-x-0.5 transition-transform" aria-hidden>→</span>
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="btn-secondary">
                  Regístrate
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-500 animate-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
          <span className="text-xs uppercase tracking-widest">Descubre más</span>
          <span className="block w-px h-10 bg-gradient-to-b from-stone-500 to-transparent" />
        </div>
      </section>

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
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white p-8 sm:p-10 hover:bg-stone-50/80 transition-all duration-300 group border border-stone-200 hover:border-gold/30 hover:shadow-card-hover"
              >
                <span className="block font-serif text-gold text-2xl mb-4 font-medium tabular-nums">
                  {s.num}
                </span>
                <h3 className="font-serif text-xl text-stone-900 font-medium mb-2 group-hover:text-gold transition-colors duration-300">
                  {s.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">{s.desc}</p>
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
          </div>
        </div>
      </section>

      {/* ——— GALERÍA / AMBIENTE ——— */}
      <section className="py-24 sm:py-32 bg-stone-50">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="section-label text-gold">Ambiente</p>
            <h2 className="section-heading mb-4">Nuestro espacio</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {galleryPlaceholder.map((item) => (
              <div
                key={item.label}
                className="aspect-[4/5] bg-stone-200 rounded-lg flex items-end p-6 sm:p-8 border border-stone-200 overflow-hidden group"
              >
                <div className="w-full h-full flex items-center justify-center text-stone-400 group-hover:text-stone-500 transition-colors">
                  <span className="font-serif text-lg text-stone-500">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— TESTIMONIOS ——— */}
      <section id="testimonios" className="py-24 sm:py-32 bg-white scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <p className="section-label text-gold">Testimonios</p>
            <h2 className="section-heading mb-4">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="relative bg-stone-50 p-8 border border-stone-200 rounded-lg hover:border-gold/20 hover:shadow-card transition-all duration-300"
              >
                <span className="absolute top-6 left-6 font-serif text-gold/30 text-4xl leading-none">"</span>
                <p className="text-stone-600 italic leading-relaxed pl-6 mb-6 min-h-[4.5rem]">
                  {t.text}
                </p>
                <footer className="pl-6 border-l-2 border-gold">
                  <cite className="not-italic font-semibold text-stone-900">{t.name}</cite>
                  {t.role && <span className="block text-stone-500 text-sm font-normal">{t.role}</span>}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

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
    </div>
  );
}
