/**
 * Layout principal de la aplicación
 * Incluye header, navegación y área de contenido
 */

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="hover:opacity-90 transition-opacity">
              <h1 className="text-2xl font-bold tracking-tight">Mr. Kutz</h1>
              <p className="text-primary-200 text-sm">
                Sistema de Gestión de Barbería
              </p>
            </Link>

            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-primary-100 text-sm truncate max-w-[150px]">
                    {user?.firstName || user?.email}
                  </span>
                  <Link
                    to="/appointments"
                    className="text-primary-100 hover:text-white text-sm font-medium"
                  >
                    Citas
                  </Link>
                  {(user?.role === 'admin' || user?.role === 'barber') && (
                    <Link
                      to="/payments"
                      className="text-primary-100 hover:text-white text-sm font-medium"
                    >
                      Pagos
                    </Link>
                  )}
                  {(user?.role === 'admin' || user?.role === 'barber') && (
                    <>
                      <Link
                        to="/clients"
                        className="text-primary-100 hover:text-white text-sm font-medium"
                      >
                        Clientes
                      </Link>
                      <Link
                        to="/services"
                        className="text-primary-100 hover:text-white text-sm font-medium"
                      >
                        Servicios
                      </Link>
                      <Link
                        to="/barbers"
                        className="text-primary-100 hover:text-white text-sm font-medium"
                      >
                        Barberos
                      </Link>
                      <Link
                        to="/inventory"
                        className="text-primary-100 hover:text-white text-sm font-medium"
                      >
                        Inventario
                      </Link>
                      <Link
                        to="/dashboard"
                        className="text-primary-100 hover:text-white text-sm font-medium"
                      >
                        Dashboard
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-primary-800 hover:bg-primary-900 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-primary-100 hover:text-white text-sm font-medium"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-white text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-gray-300 py-4 text-center text-sm">
        © {new Date().getFullYear()} Mr. Kutz - Gestión de Barbería
      </footer>
    </div>
  );
}
