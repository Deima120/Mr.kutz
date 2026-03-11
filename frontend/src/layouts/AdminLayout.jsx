/**
 * Layout administrativo - Sidebar + contenido
 * Admin: acceso completo. Barber: solo Dashboard, Citas, Clientes (consulta).
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const adminNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/appointments', label: 'Citas', icon: '📅' },
  { path: '/clients', label: 'Clientes', icon: '👥' },
  { path: '/services', label: 'Servicios', icon: '✂️' },
  { path: '/barbers', label: 'Barberos', icon: '🧔' },
  { path: '/payments', label: 'Pagos', icon: '💳' },
  { path: '/inventory', label: 'Inventario', icon: '📦' },
  { path: '/reports', label: 'Reportes', icon: '📈' },
  { path: '/settings', label: 'Configuración', icon: '⚙️' },
];

const barberNavItems = [
  { path: '/dashboard', label: 'Mi día', icon: '📊' },
  { path: '/appointments', label: 'Mis citas', icon: '📅' },
  { path: '/agenda', label: 'Agenda', icon: '📆' },
  { path: '/history', label: 'Historial', icon: '📋' },
  { path: '/clients', label: 'Clientes', icon: '👥' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { businessName } = useSettings();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : barberNavItems;
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar negro y gris */}
      <aside className="w-64 bg-barber-dark text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-700">
          <Link to="/dashboard" className="block">
            <h1 className="text-xl font-bold tracking-tight">{businessName}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{isAdmin ? 'Panel de administración' : 'Panel del barbero'}</p>
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-0.5 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/');
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-barber-dark'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="px-4 py-2 text-gray-400 text-xs">
            {user?.firstName || user?.email}
          </div>
          <div className="px-2 mt-2">
            <Link
              to="/"
              className="block px-4 py-2 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-gray-700"
            >
              ← Inicio
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-gray-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black">
              {navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.label || businessName}
            </h2>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
