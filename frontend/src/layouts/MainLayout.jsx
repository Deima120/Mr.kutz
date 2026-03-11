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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header negro, blanco y gris */}
      <header className="bg-barber-dark text-white shadow-lg sticky top-0 z-50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="text-2xl font-bold tracking-tight text-white">{businessName}</span>
              <span className="text-gray-400 text-sm hidden sm:inline">| Estilo y precisión</span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-4">
              <Link to="/" className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors rounded">
                Inicio
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/appointments" className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors rounded">
                    Mis citas
                  </Link>
                  <span className="text-gray-500 text-sm truncate max-w-[120px] hidden sm:inline">
                    {user?.firstName || user?.email}
                  </span>
                  {(user?.role === 'admin' || user?.role === 'barber') && (
                    <Link to="/dashboard" className="px-3 py-2 bg-white text-barber-dark hover:bg-gray-200 text-sm font-medium rounded transition-colors">
                      Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors rounded">
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/appointments"
                    className="px-4 py-2 bg-white text-barber-dark font-semibold rounded hover:bg-gray-100 transition-colors text-sm"
                  >
                    Agenda tu cita
                  </Link>
                  <Link to="/register" className="px-3 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors rounded hidden sm:inline">
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer negro, blanco y gris */}
      <footer className="bg-barber-charcoal text-gray-400">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3 text-center md:text-left">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">{businessName}</h3>
              <p className="text-sm">
                Estilo y precisión en cada corte. Gestión de citas, servicios y experiencia de barbería en un solo lugar.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Horarios</h3>
              <p className="text-sm">Lunes a Sábado: 9:00 – 20:00</p>
              <p className="text-sm">Domingos: 10:00 – 14:00</p>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Contacto</h3>
              <p className="text-sm">¿Preguntas? Agenda tu cita desde la app o contáctanos.</p>
              <Link to="/appointments" className="inline-block mt-2 text-white hover:text-gray-300 text-sm font-medium transition-colors">
                Agenda en línea →
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
