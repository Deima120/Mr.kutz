/**
 * Layout principal - Pública y para clientes
 * Inspirado en barberías como Casa Barbas, Las Vegas Barbershop, Barber Men
 */

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import AdminLayout from './AdminLayout';

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { businessName } = useSettings();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isAdminOrBarber = isAuthenticated && (user?.role === 'admin' || user?.role === 'barber');

  if (isAdminOrBarber) {
    return <AdminLayout><Outlet /></AdminLayout>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Top bar - línea dorada sutil */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      {/* Header */}
      <header className="bg-barber-dark text-white sticky top-0 z-50">
        <div className="relative overflow-hidden">
          {/* Textura sutil de fondo */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(201,169,98,0.03)_0%,transparent_50%)]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="container mx-auto px-4 sm:px-6 py-4 relative">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="flex items-center gap-2">
                  <span className="block w-8 h-px bg-gold group-hover:w-12 transition-all duration-300" />
                  <span className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-white group-hover:text-gold/90 transition-colors">
                    {businessName}
                  </span>
                </div>
                <span className="text-stone-500 text-sm hidden md:inline font-light">— Estilo y precisión</span>
              </Link>

              <nav className="flex items-center gap-1 sm:gap-2">
                <Link to="/" className="px-3 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                  Inicio
                </Link>
                <Link to="/#servicios" className="hidden sm:block px-3 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                  Servicios
                </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/appointments" className="px-3 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                    Mis citas
                  </Link>
                  <span className="text-stone-500 text-sm truncate max-w-[120px] hidden sm:inline">
                    {user?.firstName || user?.email}
                  </span>
                  {(user?.role === 'admin' || user?.role === 'barber') && (
                    <Link to="/dashboard" className="px-4 py-2 bg-white text-barber-dark hover:bg-stone-100 text-sm font-medium transition-colors">
                      Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-stone-500 hover:text-white text-sm transition-colors"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/appointments"
                    className="px-4 py-2 bg-white text-barber-dark font-medium hover:bg-stone-100 transition-colors text-sm"
                  >
                    Agenda tu cita
                  </Link>
                  <Link to="/register" className="px-3 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors hidden sm:inline">
                    Registrarse
                  </Link>
                </>
              )}
                <Link to="/#ubicacion" className="hidden md:block px-3 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                  Ubicación
                </Link>
              </nav>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-barber-charcoal text-stone-400">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-8 md:grid-cols-4 text-center md:text-left">
            <div>
              <h3 className="font-serif text-white font-medium text-lg mb-2">{businessName}</h3>
              <p className="text-sm">
                Estilo y precisión en cada corte. Gestión de citas, servicios y experiencia de barbería en un solo lugar.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium text-sm uppercase tracking-widest mb-2">Horarios</h3>
              <p className="text-sm">Lunes a Sábado: 9:00 – 20:00</p>
              <p className="text-sm">Domingos: 10:00 – 14:00</p>
            </div>
            <div>
              <h3 className="text-white font-medium text-sm uppercase tracking-widest mb-2">Contacto</h3>
              <p className="text-sm">¿Preguntas? Agenda tu cita desde la app o contáctanos.</p>
              <Link to="/appointments" className="inline-block mt-2 text-gold hover:text-gold-light text-sm font-medium transition-colors">
                Agenda en línea →
              </Link>
            </div>
            <div>
              <h3 className="text-white font-medium text-sm uppercase tracking-widest mb-2">Ubicación</h3>
              <p className="text-sm">Próximamente: dirección y mapa.</p>
              <Link to="/#ubicacion" className="inline-block mt-2 text-gold hover:text-gold-light text-sm font-medium transition-colors">
                Ver ubicación →
              </Link>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-8 pt-6 text-center text-sm text-stone-500">
            © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
