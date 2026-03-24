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
  { path: '/testimonials', label: 'Testimonios', icon: '💬' },
  { path: '/payments', label: 'Pagos', icon: '💳' },
  { path: '/purchases', label: 'Compras', icon: '🧾' },
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
    <div className="min-h-screen flex bg-stone-100">
      {/* Sidebar — identidad de marca */}
      <aside className="w-64 bg-barber-dark text-white flex flex-col fixed h-full shadow-2xl">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
        <div className="p-6 border-b border-stone-800">
          <Link to="/dashboard" className="block group">
            <span className="block w-5 h-px bg-gold group-hover:w-8 transition-all duration-300 mb-1" />
            <h1 className="font-serif text-xl font-medium tracking-tight text-white group-hover:text-gold/90 transition-colors">
              {businessName}
            </h1>
            <p className="text-stone-500 text-xs mt-0.5">{isAdmin ? 'Panel de administración' : 'Panel del barbero'}</p>
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-barber-dark shadow-sm border border-stone-100'
                        : 'text-stone-400 hover:bg-stone-800 hover:text-white'
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

        <div className="p-4 border-t border-stone-800">
          <div className="px-4 py-2 text-stone-500 text-xs truncate" title={user?.email}>
            {user?.firstName || user?.email}
          </div>
          <div className="px-2 mt-2 space-y-0.5">
            <Link to="/" className="block px-4 py-2 text-sm text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors">
              ← Inicio
            </Link>
            <button type="button" onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-64 h-screen min-h-0 flex flex-col overflow-hidden">
        <header className="shrink-0 bg-white/95 backdrop-blur border-b border-stone-200 px-8 py-4 z-10 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-stone-900">
              {navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.label || businessName}
            </h2>
          </div>
        </header>

        <main className="flex flex-1 flex-col min-h-0 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
