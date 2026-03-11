/**
 * Página de inicio - Inspirada en Casa Barbas, Las Vegas Barbershop, Barber Men
 * Hero, servicios, testimonios, CTA
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const services = [
  { title: 'Corte', desc: 'Cortes clásicos y de tendencia con el estilo que buscas.', icon: '✂️' },
  { title: 'Barba', desc: 'Recorte, perfilado y cuidado profesional de barba.', icon: '🧔' },
  { title: 'Corte + Barba', desc: 'Combo completo para lucir impecable.', icon: '✨' },
  { title: 'Servicios especiales', desc: 'Diseños, tintura y tratamientos a tu medida.', icon: '🌟' },
];

const testimonials = [
  { name: 'Andrés M.', text: 'El barbero entendió exactamente lo que quería. El ambiente es acogedor y el servicio impecable. Volveré.', role: 'Cliente' },
  { name: 'Cristian G.', text: 'Muy contento con el arreglo de barba. Profesional y atento. Muy recomendado.', role: 'Cliente' },
  { name: 'Adrián L.', text: 'Experiencia de lujo: buen trato y resultado excelente. Gracias por el servicio.', role: 'Cliente' },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'barber';

  return (
    <div>
      {/* Hero - Negro, blanco y gris */}
      <section className="relative bg-barber-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-barber-charcoal/80 to-barber-dark" />
        <div className="container mx-auto px-4 py-20 sm:py-28 relative">
          <div className="max-w-2xl">
            <p className="text-gray-400 font-medium tracking-wider uppercase text-sm mb-3">
              Mr. Kutz
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4">
              Estilo y precisión en cada corte
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              Cortes clásicos, barbas y servicios de barbería con la calidad que te mereces. Agenda tu cita y luce como quieres.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/appointments"
                className="px-6 py-3 bg-white text-barber-dark font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Agenda tu cita
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="px-6 py-3 border border-gray-500 text-white rounded-lg hover:border-white hover:text-white transition-colors"
                >
                  Regístrate
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sobre nosotros */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4">
              Sobre nosotros
            </h2>
            <p className="text-gray-600 leading-relaxed">
              En Mr. Kutz combinamos tradición y tendencia para ofrecerte cortes y barbas de alta calidad. 
              Nuestro equipo se asegura de que cada visita sea memorable en un ambiente acogedor. 
              Gestiona tus citas fácilmente y disfruta de un servicio pensado para ti.
            </p>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-black text-center mb-4">
            Servicios
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
            Cortes, barba y servicios especiales para que luzcas como quieres.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all"
              >
                <span className="text-3xl mb-3 block">{s.icon}</span>
                <h3 className="font-bold text-black mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/appointments"
              className="inline-flex items-center gap-2 text-black font-semibold hover:text-gray-600 transition-colors"
            >
              Ver disponibilidad y agendar →
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-black text-center mb-4">
            Testimonios
          </h2>
          <p className="text-gray-600 text-center mb-10">
            Lo que dicen nuestros clientes
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <p className="text-gray-700 italic mb-4">"{t.text}"</p>
                <p className="font-semibold text-black">{t.name}</p>
                <p className="text-gray-500 text-sm">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-barber-dark text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            ¿Listo para tu próximo corte?
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Agenda en línea en segundos. Elige fecha, barbero y servicio.
          </p>
          <Link
            to="/appointments"
            className="inline-block px-8 py-3 bg-white text-barber-dark font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Agenda tu cita ahora
          </Link>
        </div>
      </section>

      {/* Acceso rápido para admin/barber */}
      {canManage && (
        <section className="py-8 bg-gray-100 border-t border-gray-200">
          <div className="container mx-auto px-4">
            <h3 className="font-bold text-black mb-3">Acceso rápido al panel</h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard" className="px-4 py-2 bg-barber-dark text-white rounded-lg text-sm font-medium hover:bg-barber-charcoal">
                Dashboard
              </Link>
              <Link to="/clients" className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50">
                Clientes
              </Link>
              <Link to="/services" className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50">
                Servicios
              </Link>
              <Link to="/barbers" className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50">
                Barberos
              </Link>
              <Link to="/appointments" className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50">
                Citas
              </Link>
              <Link to="/payments" className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50">
                Pagos
              </Link>
              <Link to="/inventory" className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50">
                Inventario
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
