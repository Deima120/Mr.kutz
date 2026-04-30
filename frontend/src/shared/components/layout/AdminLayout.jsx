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
  { path: '/testimonials', label: 'Satisfacción', icon: '⭐' },
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

function isActiveRoute(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { businessName } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const navSections = useMemo(() => (isAdmin ? adminNavSections : barberNavSections), [isAdmin]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState(() => ({
    center: true,
    operation: true,
    business: true,
    system: true,
  }));

  const activeItem = navSections
    .flatMap((section) => section.items)
    .find((item) => isActiveRoute(location.pathname, item.path));

  useEffect(() => {
    const activeSection = navSections.find((section) =>
      section.items.some((item) => isActiveRoute(location.pathname, item.path))
    );

    if (activeSection) {
      setOpenSections((current) => ({ ...current, [activeSection.id]: true }));
    }

    setMobileSidebarOpen(false);
  }, [location.pathname, navSections]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleSection = (sectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  };

  return (
    <div className="min-h-screen bg-stone-100 overflow-x-hidden">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-stone-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Cerrar menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#070605_0%,#11100f_48%,#070605_100%)] text-white shadow-2xl transition-all duration-500 ease-out ${
          sidebarCollapsed ? 'lg:w-[5.75rem]' : 'lg:w-72'
        } ${mobileSidebarOpen ? 'translate-x-0 w-[19rem]' : '-translate-x-full w-[19rem] lg:translate-x-0'}`}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden />

        <div className="relative border-b border-white/10 px-4 py-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gold/15 blur-3xl" />
          <div className={`relative flex items-start gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
            <Link
              to="/dashboard"
              className={`group min-w-0 flex-1 ${sidebarCollapsed ? 'lg:flex lg:justify-center' : ''}`}
              title={businessName}
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold shadow-gold-glow transition-transform duration-300 group-hover:-translate-y-0.5">
                <Sparkles size={20} strokeWidth={1.8} />
              </span>
              <span className={`${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <span className="block h-px w-8 bg-gold/80 transition-all duration-300 group-hover:w-14" />
                <span className="mt-2 block truncate font-serif text-xl font-medium tracking-tight text-white">
                  {businessName}
                </span>
                <span className="mt-1 block text-xs text-stone-500">
                  {isAdmin ? 'Panel de administracion' : 'Panel del barbero'}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-xl p-2 text-stone-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Cerrar menu"
            >
              <X size={20} />
            </button>
          </div>
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

        <div className="border-t border-white/10 p-3">
          <div className={`mb-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-sm font-bold text-gold">
                {(user?.firstName || user?.email || 'U').trim().charAt(0).toUpperCase()}
              </span>
              <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <p className="truncate text-sm font-semibold text-white" title={user?.email}>
                  {user?.firstName || user?.email}
                </p>
                <p className="truncate text-xs text-stone-500">{isAdmin ? 'Administrador' : 'Barbero'}</p>
              </div>
            </div>
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

      <div className="flex-1 ml-64 min-w-0 w-0 max-w-full h-screen min-h-0 flex flex-col overflow-hidden">
        <header className="shrink-0 bg-white/95 backdrop-blur border-b border-stone-200 px-4 sm:px-6 md:px-8 py-3 md:py-4 z-10 shadow-card min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-stone-900">
              {navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.label || businessName}
            </h2>
          </div>
        </header>

        <main className="admin-content-scroll flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
