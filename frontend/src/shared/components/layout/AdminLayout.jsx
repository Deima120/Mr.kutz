/**
 * Layout administrativo - Sidebar + contenido.
 * Admin: acceso completo. Barber: acceso operativo.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Scissors,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useSettings } from '@/shared/contexts/SettingsContext';

const adminNavSections = [
  {
    id: 'center',
    label: 'Centro de control',
    items: [
      { path: '/dashboard', label: 'Dashboard', description: 'Vista general', Icon: LayoutDashboard },
    ],
  },
  {
    id: 'operation',
    label: 'Operacion',
    items: [
      { path: '/appointments', label: 'Citas', description: 'Agenda y estados', Icon: CalendarCheck },
      { path: '/clients', label: 'Clientes', description: 'Historial y perfiles', Icon: UsersRound },
      { path: '/services', label: 'Servicios', description: 'Catalogo de cortes', Icon: Scissors },
      { path: '/barbers', label: 'Barberos', description: 'Equipo y horarios', Icon: UserRound },
      { path: '/testimonials', label: 'Satisfaccion', description: 'Valoraciones', Icon: Star },
    ],
  },
  {
    id: 'business',
    label: 'Negocio',
    items: [
      { path: '/payments', label: 'Pagos', description: 'Ventas cobradas', Icon: CreditCard },
      { path: '/purchases', label: 'Compras', description: 'Entradas de stock', Icon: PackageCheck },
      { path: '/inventory', label: 'Inventario', description: 'Productos y alertas', Icon: Boxes },
      { path: '/reports', label: 'Reportes', description: 'Metricas clave', Icon: TrendingUp },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      { path: '/settings', label: 'Configuracion', description: 'Marca y negocio', Icon: Settings },
    ],
  },
];

const barberNavSections = [
  {
    id: 'center',
    label: 'Centro de control',
    items: [
      { path: '/dashboard', label: 'Mi dia', description: 'Resumen diario', Icon: LayoutDashboard },
    ],
  },
  {
    id: 'operation',
    label: 'Operacion',
    items: [
      { path: '/appointments', label: 'Mis citas', description: 'Servicios asignados', Icon: CalendarCheck },
      { path: '/agenda', label: 'Agenda', description: 'Semana de trabajo', Icon: CalendarDays },
      { path: '/history', label: 'Historial', description: 'Servicios realizados', Icon: BarChart3 },
      { path: '/clients', label: 'Clientes', description: 'Consulta rapida', Icon: UsersRound },
    ],
  },
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

  const userInitial = (user?.firstName || user?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-100">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-stone-950/65 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Cerrar menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#080706_0%,#11100f_45%,#080706_100%)] text-white shadow-2xl transition-all duration-500 ease-out ${
          sidebarCollapsed ? 'lg:w-[5.75rem]' : 'lg:w-72'
        } ${mobileSidebarOpen ? 'w-[19rem] translate-x-0' : 'w-[19rem] -translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden />

        <div className="relative border-b border-white/10 px-4 py-5">
          <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-gold/12 blur-3xl" />
          <div className={`relative flex items-start gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`group min-w-0 flex-1 text-left ${sidebarCollapsed ? 'lg:flex lg:justify-center' : ''}`}
              title={sidebarCollapsed ? 'Expandir menu' : 'Contraer menu'}
              aria-label={sidebarCollapsed ? 'Expandir menu' : 'Contraer menu'}
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/35 bg-gold/10 text-gold shadow-gold-glow transition-transform duration-300 group-hover:-translate-y-0.5">
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
            </button>

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

        <nav className="admin-sidebar-scroll relative flex-1 overflow-y-auto px-3 py-4">
          <div className="pointer-events-none sticky top-0 z-10 h-3 bg-gradient-to-b from-[#090807] to-transparent" />

          {navSections.map((section) => {
            const sectionActive = section.items.some((item) => isActiveRoute(location.pathname, item.path));
            const isOpen = sidebarCollapsed || openSections[section.id];

            return (
              <div key={section.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    sectionActive ? 'text-gold' : 'text-stone-600 hover:text-stone-400'
                  } ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                  aria-expanded={isOpen}
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div
                  className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] translate-y-0 opacity-100' : 'grid-rows-[0fr] -translate-y-1 opacity-0'
                  }`}
                >
                  <ul className="min-h-0 space-y-1 overflow-hidden">
                    {section.items.map((item) => {
                      const active = isActiveRoute(location.pathname, item.path);
                      const Icon = item.Icon;

                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            title={sidebarCollapsed ? item.label : undefined}
                            className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${
                              active
                                ? 'bg-white text-barber-dark shadow-[0_18px_44px_rgba(255,255,255,0.12)]'
                                : 'text-stone-400 hover:bg-white/[0.07] hover:text-white'
                            } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                          >
                            {active && (
                              <span
                                className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gold"
                                aria-hidden
                              />
                            )}
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                                active
                                  ? 'bg-barber-dark text-gold'
                                  : 'bg-white/[0.04] text-stone-400 group-hover:bg-gold/15 group-hover:text-gold'
                              }`}
                            >
                              <Icon size={20} strokeWidth={1.8} />
                            </span>
                            <span className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                              <span className="block truncate">{item.label}</span>
                              <span
                                className={`block truncate text-xs font-medium ${
                                  active ? 'text-stone-500' : 'text-stone-600 group-hover:text-stone-400'
                                }`}
                              >
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}

          <div className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-[#090807] to-transparent" />
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className={`mb-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-sm font-bold text-gold">
                {userInitial}
              </span>
              <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <p className="truncate text-sm font-semibold text-white" title={user?.email}>
                  {user?.firstName || user?.email}
                </p>
                <p className="truncate text-xs text-stone-500">{isAdmin ? 'Administrador' : 'Barbero'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-1">
            <Link
              to="/"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-400 transition hover:bg-white/[0.07] hover:text-white ${
                sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
              title={sidebarCollapsed ? 'Inicio' : undefined}
            >
              <Home size={18} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Inicio</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-400 transition hover:bg-red-500/10 hover:text-red-200 ${
                sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
              title={sidebarCollapsed ? 'Cerrar sesion' : undefined}
            >
              <LogOut size={18} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Cerrar sesion</span>
            </button>
          </div>
        </div>
      </aside>

      <div
        className={`flex h-screen min-h-0 min-w-0 flex-col overflow-hidden transition-[margin] duration-500 ${
          sidebarCollapsed ? 'lg:ml-[5.75rem]' : 'lg:ml-72'
        }`}
      >
        <header className="shrink-0 border-b border-stone-200 bg-white/90 px-4 py-3 shadow-card backdrop-blur sm:px-6 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-xl border border-stone-200 bg-white p-2 text-stone-700 shadow-sm transition hover:border-gold/50 hover:text-stone-950 lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-dark">
                  {isAdmin ? 'Administracion' : 'Operacion'}
                </p>
                <h2 className="truncate font-serif text-xl font-medium text-stone-900">
                  {activeItem?.label || businessName}
                </h2>
              </div>
            </div>

            <span className="hidden rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-500 sm:inline-flex">
              {activeItem?.description || 'Panel'}
            </span>
          </div>
        </header>

        <main className="admin-content-scroll flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
