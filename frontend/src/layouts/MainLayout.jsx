/**
 * Layout principal — Página pública y clientes
 * Diseño premium inspirado en barberías de alto nivel
 */

import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import AdminLayout from './AdminLayout';
const FALLBACK_HOURS = 'Lunes a Sábado: 9:00 – 20:00 · Domingo: 10:00 – 14:00';

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { businessName, openingHours } = useSettings();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isAdminOrBarber = isAuthenticated && (user?.role === 'admin' || user?.role === 'barber');

  if (isAdminOrBarber) {
    return <AdminLayout><Outlet /></AdminLayout>;
  }

  const closeMobile = () => setMobileMenuOpen(false);
  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/#servicios', label: 'Servicios' },
    { to: '/#testimonios', label: 'Testimonios' },
    { to: '/#ubicacion', label: 'Ubicación' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Línea superior dorada — marca distintiva */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden />

      <header className="bg-barber-dark text-white sticky top-0 z-50 border-b border-stone-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link
              to="/"
              className="flex items-center gap-3 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="block w-6 h-px bg-gold group-hover:w-10 transition-all duration-300" aria-hidden />
              <span className="font-serif text-xl md:text-2xl font-medium tracking-tight text-white group-hover:text-gold transition-colors duration-300">
                {businessName}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors duration-200"
                >
                  {label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link to="/appointments" className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                    Mis citas
                  </Link>
                  <span className="text-stone-500 text-sm truncate max-w-[140px] ml-1" title={user?.email}>
                    {user?.firstName || user?.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="ml-2 px-4 py-2 text-stone-500 hover:text-white text-sm transition-colors"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/appointments"
                    className="ml-2 px-5 py-2.5 bg-white text-barber-dark font-semibold text-sm hover:bg-stone-100 transition-colors duration-200"
                  >
                    Agenda tu cita
                  </Link>
                  <Link to="/register" className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                    Registrarse
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 text-stone-400 hover:text-white"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menú"
            >
              <span className="block w-6 h-0.5 bg-current mb-1.5" />
              <span className="block w-6 h-0.5 bg-current mb-1.5" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-800 bg-barber-charcoal animate-fade-in">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className="px-4 py-3 text-stone-300 hover:text-white hover:bg-stone-800/50 rounded-lg text-sm font-medium"
                >
                  {label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link to="/appointments" onClick={closeMobile} className="px-4 py-3 text-stone-300 hover:text-white rounded-lg text-sm">
                    Mis citas
                  </Link>
                  <button type="button" onClick={handleLogout} className="text-left px-4 py-3 text-stone-500 hover:text-white rounded-lg text-sm">
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobile} className="px-4 py-3 text-stone-300 hover:text-white rounded-lg text-sm">
                    Iniciar sesión
                  </Link>
                  <Link to="/appointments" onClick={closeMobile} className="px-4 py-3 bg-gold text-barber-dark font-semibold rounded-lg text-sm text-center mt-2">
                    Agenda tu cita
                  </Link>
                  <Link to="/register" onClick={closeMobile} className="px-4 py-3 text-gold hover:text-gold-light rounded-lg text-sm text-center">
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-barber-charcoal text-stone-400 border-t border-stone-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="font-serif text-white font-medium text-lg mb-3">{businessName}</h3>
              <p className="text-sm leading-relaxed max-w-xs">
                Estilo y precisión en cada corte. Tradición de barbería con el cuidado que mereces.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-3">Horarios</h3>
              <p className="text-sm leading-relaxed">{openingHours || FALLBACK_HOURS}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-3">Contacto</h3>
              <p className="text-sm mb-2">¿Preguntas? Te esperamos.</p>
              <Link to="/appointments" className="inline-flex items-center gap-1 text-gold hover:text-gold-light text-sm font-medium transition-colors">
                Agenda en línea
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-3">Ubicación</h3>
              <p className="text-sm mb-2">Visítanos en nuestra barbería.</p>
              <Link to="/#ubicacion" className="inline-flex items-center gap-1 text-gold hover:text-gold-light text-sm font-medium transition-colors">
                Ver mapa
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-stone-800 text-center text-sm text-stone-500">
            © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
