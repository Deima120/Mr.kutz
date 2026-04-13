/**
 * Layout administrativo - Sidebar + contenido
 * Admin: acceso completo. Barber: solo Dashboard, Citas, Clientes (consulta).
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCircle,
  Star,
  CreditCard,
  Receipt,
  Package,
  TrendingUp,
  Settings,
  CalendarDays,
  ClipboardList,
  Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const navIconClass = 'w-5 h-5 shrink-0';

const adminNavItems = [
  { path: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/appointments', label: 'Citas', Icon: Calendar },
  { path: '/clients', label: 'Clientes', Icon: Users },
  { path: '/services', label: 'Servicios', Icon: Scissors },
  { path: '/barbers', label: 'Barberos', Icon: UserCircle },
  { path: '/testimonials', label: 'Satisfacción', Icon: Star },
  { path: '/payments', label: 'Pagos', Icon: CreditCard },
  { path: '/purchases', label: 'Compras', Icon: Receipt },
  { path: '/inventory', label: 'Inventario', Icon: Package },
  { path: '/reports', label: 'Reportes', Icon: TrendingUp },
  { path: '/settings', label: 'Configuración', Icon: Settings },
];

const barberNavItems = [
  { path: '/dashboard', label: 'Mi día', Icon: LayoutDashboard },
  { path: '/appointments', label: 'Mis citas', Icon: Calendar },
  { path: '/agenda', label: 'Agenda', Icon: CalendarDays },
  { path: '/history', label: 'Historial', Icon: ClipboardList },
  { path: '/clients', label: 'Clientes', Icon: Users },
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
    <div className="min-h-screen flex bg-stone-100 overflow-x-hidden max-w-[100vw]">
      {/* Sidebar — identidad de marca */}
      <aside className="w-64 shrink-0 bg-barber-dark text-white flex flex-col fixed h-full shadow-2xl z-30">
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
              const isActive =
                location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              const { Icon } = item;
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
                    <Icon className={navIconClass} strokeWidth={1.75} aria-hidden />
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
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 text-sm text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              <Home className="w-4 h-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
              Inicio
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-64 min-w-0 w-0 max-w-full h-screen min-h-0 flex flex-col overflow-hidden">
        <header className="shrink-0 bg-white/95 backdrop-blur border-b border-stone-200 px-4 sm:px-6 md:px-8 py-3 md:py-4 z-10 shadow-card min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-stone-900">
              {navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))
                ?.label || businessName}
            </h2>
          </div>
        </header>

        <main className="flex flex-1 flex-col min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
