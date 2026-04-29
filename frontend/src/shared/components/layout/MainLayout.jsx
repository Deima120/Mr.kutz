/**
 * Layout principal — Página pública y clientes
 * Diseño premium inspirado en barberías de alto nivel
 */

import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useSettings } from '@/shared/contexts/SettingsContext';
import AdminLayout from './AdminLayout';
const FALLBACK_HOURS = 'Lunes a Sábado: 9:00 – 20:00 · Domingo: 10:00 – 14:00';

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { businessName, openingHours } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const didHandleInitialLoadRef = useRef(false);
  const profileMenuRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  };

  const isAdminOrBarber = isAuthenticated && (user?.role === 'admin' || user?.role === 'barber');

  const closeMobile = () => setMobileMenuOpen(false);
  const profileInitial = (user?.firstName || user?.email || 'U').trim().charAt(0).toUpperCase();
  const handleHomeClick = (e) => {
    closeMobile();
    if (location.pathname === '/' && !location.hash) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/#servicios', label: 'Servicios' },
    { to: '/reservar', label: 'Reservar' },
    { to: '/#satisfaccion', label: 'Satisfacción' },
    { to: '/#ubicacion', label: 'Ubicación' },
  ];

  useEffect(() => {
    if (!didHandleInitialLoadRef.current) {
      didHandleInitialLoadRef.current = true;
      const navEntry = window?.performance?.getEntriesByType?.('navigation')?.[0];
      const isReload = navEntry?.type === 'reload';
      if (isReload) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        if (location.hash) {
          navigate('/', { replace: true });
        }
        return;
      }
    }

    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    const el = document.getElementById(targetId);
    if (!el) return;

    // Espera al render final tras cambio de ruta antes de hacer scroll.
    requestAnimationFrame(() => {
      const defaultOffset = window.innerWidth < 768 ? 76 : 92;
      const offsetBySection = {
        // Ajuste fino para que "Ubicación" muestre encabezado y mapa al llegar.
        ubicacion: window.innerWidth < 768 ? 118 : 156,
      };
      const headerOffset = offsetBySection[targetId] ?? defaultOffset;
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }, [location.pathname, location.hash, navigate]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };

    const onEsc = (e) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [profileMenuOpen]);

  if (isAdminOrBarber) {
    return <AdminLayout><Outlet /></AdminLayout>;
  }

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
              {isAuthenticated && user?.role === 'client' ? (
                <>
                  <Link
                    to="/"
                    onClick={handleHomeClick}
                    className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors duration-200"
                  >
                    Inicio
                  </Link>
                  <Link to="/appointments" className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors">
                    Mis citas
                  </Link>
                  <div className="relative ml-1" ref={profileMenuRef}>
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((v) => !v)}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-stone-700/80 bg-stone-800/70 hover:border-gold/60 hover:bg-stone-700/80 transition-all"
                      aria-expanded={profileMenuOpen}
                      aria-haspopup="menu"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-semibold">
                        {profileInitial}
                      </span>
                      <span className="text-stone-200 text-sm font-medium pr-1">Mi perfil</span>
                    </button>
                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-44 rounded-xl border border-stone-700 bg-stone-900/95 backdrop-blur shadow-2xl p-1.5 z-50" role="menu">
                        <Link
                          to="/profile"
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 rounded-lg"
                          role="menuitem"
                        >
                          Ver perfil
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg"
                          role="menuitem"
                        >
                          Salir
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : isAuthenticated ? (
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
                  {navLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={to === '/' ? handleHomeClick : undefined}
                      className="px-4 py-2 text-stone-400 hover:text-white text-sm font-medium transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  ))}
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
              {isAuthenticated && user?.role === 'client' ? (
                <>
                  <Link
                    to="/"
                    onClick={handleHomeClick}
                    className="px-4 py-3 text-stone-300 hover:text-white hover:bg-stone-800/50 rounded-lg text-sm font-medium"
                  >
                    Inicio
                  </Link>
                  <Link to="/profile" onClick={closeMobile} className="px-4 py-3 text-stone-300 hover:text-white rounded-lg text-sm">
                    Mi perfil
                  </Link>
                  <Link to="/appointments" onClick={closeMobile} className="px-4 py-3 text-stone-300 hover:text-white rounded-lg text-sm">
                    Mis citas
                  </Link>
                  <button type="button" onClick={handleLogout} className="text-left px-4 py-3 text-stone-500 hover:text-white rounded-lg text-sm">
                    Salir
                  </button>
                </>
              ) : isAuthenticated ? (
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
                  {navLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={to === '/' ? handleHomeClick : closeMobile}
                      className="px-4 py-3 text-stone-300 hover:text-white hover:bg-stone-800/50 rounded-lg text-sm font-medium"
                    >
                      {label}
                    </Link>
                  ))}
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
              <h3 className="text-white font-semibold text-xs tracking-widest mb-3">Horarios</h3>
              <p className="text-sm leading-relaxed">{openingHours || FALLBACK_HOURS}</p>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xs tracking-widest mb-3">Contacto</h3>
              <p className="text-sm mb-2">¿Preguntas? Te esperamos.</p>
              <Link to="/appointments" className="inline-flex items-center gap-1 text-gold hover:text-gold-light text-sm font-medium transition-colors">
                Agenda en línea
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xs tracking-widest mb-3">Ubicación</h3>
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
