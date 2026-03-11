/**
 * Landing page - Estilo simple y de lujo
 * Hero minimalista, servicios, testimonios, CTA
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const services = [
  { title: 'Corte', desc: 'Cortes clásicos y de tendencia con el estilo que buscas.' },
  { title: 'Barba', desc: 'Recorte, perfilado y cuidado profesional de barba.' },
  { title: 'Corte + Barba', desc: 'Combo completo para lucir impecable.' },
  { title: 'Servicios especiales', desc: 'Diseños, tintura y tratamientos a tu medida.' },
];

const testimonials = [
  { name: 'Andrés M.', text: 'El barbero entendió exactamente lo que quería. El ambiente es acogedor y el servicio impecable. Volveré.' },
  { name: 'Cristian G.', text: 'Muy contento con el arreglo de barba. Profesional y atento. Muy recomendado.' },
  { name: 'Adrián L.', text: 'Experiencia de lujo: buen trato y resultado excelente. Gracias por el servicio.' },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { businessName } = useSettings();
  const canManage = user?.role === 'admin' || user?.role === 'barber';

  return (
    <div className="font-sans">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center bg-barber-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,169,98,0.08)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="container mx-auto px-6 sm:px-8 py-24 relative">
          <div className="max-w-2xl">
            <p className="font-serif text-gold tracking-[0.3em] uppercase text-sm mb-6">
              {businessName}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight mb-6">
              Estilo y precisión en cada corte
            </h1>
            <p className="text-stone-400 text-lg sm:text-xl max-w-lg leading-relaxed mb-10">
              Cortes clásicos, barbas y servicios de barbería con la calidad que te mereces.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/appointments"
                className="group inline-flex items-center gap-2 px-8 py-3.5 bg-white text-barber-dark font-medium text-sm tracking-wide hover:bg-stone-100 transition-colors duration-300"
              >
                Agenda tu cita
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="px-8 py-3.5 border border-stone-600 text-white font-medium text-sm tracking-wide hover:border-gold hover:text-gold transition-colors duration-300"
                >
                  Regístrate
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sobre nosotros */}
      <section className="py-24 sm:py-32 bg-stone-50">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-6">
              Sobre nosotros
            </h2>
            <div className="w-12 h-px bg-gold mx-auto mb-8" />
            <p className="text-stone-600 leading-relaxed text-lg">
              En {businessName} combinamos tradición y tendencia para ofrecerte cortes y barbas de alta calidad.
              Nuestro equipo se asegura de que cada visita sea memorable en un ambiente acogedor.
            </p>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="py-24 sm:py-32 bg-white scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-4">
              Servicios
            </h2>
            <div className="w-12 h-px bg-gold mx-auto mb-4" />
            <p className="text-stone-500 max-w-md mx-auto">
              Cortes, barba y servicios especiales para que luzcas como quieres.
            </p>
          </div>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-stone-200">
            {services.map((s, i) => (
              <div
                key={s.title}
                className="bg-white p-8 sm:p-10 hover:bg-stone-50 transition-colors duration-300 group"
              >
                <span className="block font-serif text-gold text-2xl mb-4 font-medium">
                  0{i + 1}
                </span>
                <h3 className="font-serif text-xl text-stone-900 font-medium mb-2 group-hover:text-gold transition-colors">
                  {s.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/appointments"
              className="inline-flex items-center gap-2 text-stone-700 font-medium text-sm tracking-wide hover:text-gold transition-colors duration-300"
            >
              Ver disponibilidad y agendar
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-24 sm:py-32 bg-stone-50">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-4">
              Testimonios
            </h2>
            <div className="w-12 h-px bg-gold mx-auto mb-4" />
            <p className="text-stone-500">
              Lo que dicen nuestros clientes
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="relative bg-white p-8 border border-stone-200"
              >
                <span className="absolute top-6 left-6 font-serif text-gold/40 text-4xl">"</span>
                <p className="text-stone-600 italic leading-relaxed pl-6 mb-6">
                  {t.text}
                </p>
                <footer className="pl-6 border-l-2 border-gold">
                  <cite className="not-italic font-medium text-stone-900">{t.name}</cite>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Ubicación - placeholder para futuro */}
      <section id="ubicacion" className="py-24 sm:py-32 bg-white border-t border-stone-200 scroll-mt-20">
        <div className="container mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-4">
              Ubicación
            </h2>
            <div className="w-12 h-px bg-gold mx-auto mb-4" />
            <p className="text-stone-500 max-w-md mx-auto">
              Visítanos en nuestra barbería. Próximamente podrás ver la dirección y el mapa.
            </p>
          </div>
          <div className="max-w-3xl mx-auto aspect-video bg-stone-100 border border-stone-200 flex items-center justify-center">
            <div className="text-center text-stone-400">
              <p className="font-serif text-lg text-stone-500 mb-2">Mapa próximamente</p>
              <p className="text-sm">Aquí se mostrará la ubicación del negocio</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 sm:py-32 bg-barber-dark text-white">
        <div className="container mx-auto px-6 sm:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium mb-4">
            ¿Listo para tu próximo corte?
          </h2>
          <div className="w-12 h-px bg-gold mx-auto mb-6" />
          <p className="text-stone-400 mb-10 max-w-md mx-auto">
            Agenda en línea en segundos. Elige fecha, barbero y servicio.
          </p>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-barber-dark font-medium text-sm tracking-wide hover:bg-stone-100 transition-colors duration-300"
          >
            Agenda tu cita ahora
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Acceso rápido para admin/barber */}
      {canManage && (
        <section className="py-8 bg-stone-100 border-t border-stone-200">
          <div className="container mx-auto px-6 sm:px-8">
            <h3 className="font-serif text-stone-800 font-medium mb-4 text-sm tracking-wide uppercase">
              Acceso rápido al panel
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-barber-dark text-white text-sm font-medium hover:bg-barber-charcoal transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/clients"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Clientes
              </Link>
              <Link
                to="/services"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Servicios
              </Link>
              <Link
                to="/barbers"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Barberos
              </Link>
              <Link
                to="/appointments"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Citas
              </Link>
              <Link
                to="/payments"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Pagos
              </Link>
              <Link
                to="/inventory"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-medium hover:border-gold hover:text-gold transition-colors"
              >
                Inventario
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
