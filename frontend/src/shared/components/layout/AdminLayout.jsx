/**
 * Layout administrativo - Sidebar + contenido.
 * Admin: acceso completo. Barber: acceso operativo.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
// [DESACTIVADO-REPORTES-CAJA 2026-08-12] Módulo de Reportes/Caja oculto de la vista del usuario.
// Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md — reactivar descomentando este bloque.
// import { CashRegisterProvider } from '@/features/cash-registers/CashRegisterContext';

import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  ShieldCheck,
  Lock,
  BarChart3,
  UsersRound,
  ChevronDown,
  LogOut,
  X,
  Menu,
  Calendar,
  Scissors,
  UserCog,
  Star,
  CreditCard,
  ShoppingCart,
  Package,
  Gift,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  // [DESACTIVADO-REPORTES-CAJA 2026-08-12] Icono usado solo por el item de Reportes.
  // Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md — reactivar descomentando este bloque.
  // FileBarChart,
} from 'lucide-react';

const adminDashboardItem = {
  path: '/dashboard',
  label: 'Dashboard',
  description: 'Panel general',
  Icon: LayoutDashboard,
};

const adminNavSections = [
  {
    id: 'operation',
    label: 'Operacion',
    items: [
      // Citas no tiene permiso propio todavía: su lógica interna sigue ramificada
      // por `user.role` (isAdmin/isBarber/isClient), no solo por permisos, así que
      // migrarla de verdad implica reescribir esa pantalla. Mientras tanto se marca
      // `adminOnly` para que solo la vea `admin` literal, igual que hoy — así no
      // aparece un enlace de menú que apunte a una ruta que todavía lo rebotaría.
      { path: '/appointments', label: 'Citas', description: 'Gestionar citas', Icon: Calendar, adminOnly: true },
      {
        path: '/clients',
        label: 'Clientes',
        description: 'Base de datos',
        Icon: UsersRound,
        permission: 'clients.view',
      },
      {
        path: '/services',
        label: 'Servicios',
        description: 'Servicios y precios',
        Icon: Scissors,
        permission: 'services.manage',
      },
      {
        path: '/barbers',
        label: 'Barberos',
        description: 'Equipo de trabajo',
        Icon: UserCog,
        permission: 'barbers.view',
      },
    ],
  },
  {
    // Antes era una sola sección "Negocio" que mezclaba venta, abastecimiento e
    // inventario. Se parte en dos para que el menú siga los procesos de la ficha
    // del proyecto: lo que genera ingresos y lo que abastece al negocio.
    id: 'commercial',
    label: 'Comercial',
    items: [
      // Ventas va primero porque la valoración del cliente es posterior al cobro.
      {
        path: '/payments',
        label: 'Ventas',
        description: 'Registro de ventas',
        Icon: CreditCard,
        permission: 'payments.view',
      },
      {
        path: '/testimonials',
        label: 'Satisfaccion',
        description: 'Valoraciones',
        Icon: Star,
        permission: 'testimonials.manage',
      },
      // [PENDIENTE-FIDELIZACION] Hueco reservado para el módulo de Fidelización de
      // clientes, que pertenece a este proceso. Hoy la lógica existe solo en backend
      // (services/clientLoyaltyRules.js y clientLoyaltyRewards.service.js) y se ve
      // dentro de la ficha del cliente, sin pantalla propia. Al implementarla, añadir
      // aquí su entrada con la ruta definitiva.
      // { path: '/loyalty', label: 'Fidelizacion', description: 'Beneficios por recurrencia', Icon: Gift },
    ],
  },
  {
    id: 'supply',
    label: 'Abastecimiento',
    items: [
      // "Gastos" es el nombre que usa la clienta para este proceso: son los gastos
      // que hace para llenar el inventario de insumos. Internamente el módulo sigue
      // siendo `purchases` (ruta /purchases), solo cambia la etiqueta visible.
      {
        path: '/purchases',
        label: 'Gastos',
        description: 'Insumos y proveedores',
        Icon: ShoppingCart,
        permission: 'purchases.view',
      },
      {
        path: '/inventory',
        label: 'Inventario',
        description: 'Stock y productos',
        Icon: Package,
        permission: 'inventory.view',
      },
      {
        path: '/loyalty',
        label: 'Fidelización',
        description: 'Hitos y recompensas',
        Icon: Gift,
        permission: 'loyalty.view',
      },
    ],
  },
  {
    // Ojo: el id NO es 'system'. Ese lo usa el bloque comentado del ADR de
    // Reportes/Caja que hay justo debajo, y si algún día se reactiva habría dos
    // secciones con el mismo identificador.
    id: 'access',
    label: 'Sistema',
    // Los dos items se filtran por permiso más abajo: un rol personalizado sin
    // `users.view` no debe ver siquiera la entrada del menú.
    items: [
      {
        path: '/users',
        label: 'Usuarios',
        description: 'Personal y accesos',
        Icon: ShieldCheck,
        permission: 'users.view',
      },
      {
        path: '/roles',
        label: 'Roles',
        description: 'Permisos por rol',
        Icon: Lock,
        permission: 'roles.view',
      },
    ],
  },
  // [DESACTIVADO-REPORTES-CAJA 2026-08-12] Módulo de Reportes/Caja oculto de la vista del usuario.
  // Se comenta la sección "Sistema" completa (no solo el item) porque Reportes era su única
  // entrada y dejarla vacía renderizaría un encabezado huérfano.
  // Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md — reactivar descomentando este bloque.
  // {
  //   id: 'system',
  //   label: 'Sistema',
  //   items: [
  //     { path: '/reports', label: 'Reportes', description: 'Estadisticas', Icon: FileBarChart },
  //   ],
  // },
];

const barberDashboardItem = {
  path: '/dashboard',
  label: 'Mi dia',
  description: 'Resumen diario',
  Icon: LayoutDashboard,
};

const barberNavSections = [
  {
    id: 'operation',
    label: 'Operacion',
    items: [
      { path: '/appointments', label: 'Mis citas', description: 'Servicios asignados', Icon: CalendarCheck },
      { path: '/agenda', label: 'Agenda', description: 'Semana de trabajo', Icon: CalendarDays },
      { path: '/history', label: 'Historial', description: 'Servicios realizados', Icon: BarChart3 },
    ],
  },
];

/**
 * Color del sidebar — preferencia del administrador, no del sistema.
 *
 * Se guarda en `localStorage` (no en la cuenta) porque es una preferencia de
 * este equipo/navegador, igual de personal que el zoom: no hay campo en el
 * backend que la respalde y no tendría sentido arrastrarla a otra máquina sin
 * que nadie lo haya pedido. Si el almacenamiento está bloqueado (modo privado)
 * se cae al tema oscuro, que es el histórico del panel.
 */
const SIDEBAR_THEME_KEY = 'mrkutz.sidebarTheme';

function readStoredSidebarTheme() {
  try {
    return window.localStorage.getItem(SIDEBAR_THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Las dos paletas del sidebar. Ambas se mueven dentro de los colores de la
 * marca (negro, blanco y dorado): la clara cambia el fondo y el texto, pero
 * el dorado sigue siendo el acento y el estado activo sigue siendo el
 * contraste máximo contra el fondo (blanco sobre negro / negro sobre blanco).
 */
const SIDEBAR_THEMES = {
  dark: {
    aside:
      'border-r border-white/10 bg-[linear-gradient(180deg,#080706_0%,#11100f_45%,#080706_100%)] text-white',
    divider: 'border-white/[0.04]',
    glow: 'bg-gold/12',
    brandBox: 'border-gold/35 bg-gold/10 text-gold shadow-gold-glow',
    brandText: 'text-white',
    brandSubtitle: 'text-stone-500',
    brandRule: 'bg-gold/80',
    iconButton: 'text-stone-400 hover:bg-white/10 hover:text-gold',
    switchTrack: 'border-white/10 bg-white/[0.06]',
    switchKnob: 'translate-x-0 bg-gold text-barber-dark',
    switchIconIdle: 'text-stone-500',
    sectionActive: 'text-gold',
    sectionIdle: 'text-stone-600 hover:text-stone-400',
    navActive: 'bg-white text-barber-dark shadow-[0_18px_44px_rgba(255,255,255,0.12)]',
    navIdle: 'text-stone-400 hover:bg-white/[0.07] hover:text-white',
    navIconActive: 'bg-barber-dark text-gold',
    navIconIdle: 'bg-white/[0.04] text-stone-400 group-hover:bg-gold/15 group-hover:text-gold',
    navDescActive: 'text-stone-500',
    navDescIdle: 'text-stone-600 group-hover:text-stone-400',
    fadeTop: 'from-[#080706]/25',
    fadeBottom: 'from-[#080706]/20',
    userCard: 'border-white/[0.04] bg-white/[0.03]',
    userAvatar: 'bg-gold/15 text-gold',
    userName: 'text-white',
    userRole: 'text-stone-500',
    logout: 'text-stone-400 hover:bg-red-500/10 hover:text-red-200',
  },
  light: {
    aside:
      'border-r border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaf9_45%,#ffffff_100%)] text-stone-900',
    divider: 'border-stone-200/80',
    glow: 'bg-gold/20',
    brandBox: 'border-gold/45 bg-gold/15 text-gold-dark',
    brandText: 'text-stone-900',
    brandSubtitle: 'text-stone-500',
    brandRule: 'bg-gold',
    iconButton: 'text-stone-500 hover:bg-stone-100 hover:text-gold-dark',
    switchTrack: 'border-stone-200 bg-stone-100',
    switchKnob: 'translate-x-[1.375rem] bg-barber-dark text-gold',
    switchIconIdle: 'text-stone-400',
    sectionActive: 'text-gold-dark',
    sectionIdle: 'text-stone-400 hover:text-stone-600',
    navActive: 'bg-barber-dark text-white shadow-[0_18px_44px_rgba(12,10,9,0.18)]',
    navIdle: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
    navIconActive: 'bg-white/10 text-gold',
    navIconIdle: 'bg-stone-100 text-stone-500 group-hover:bg-gold/20 group-hover:text-gold-dark',
    navDescActive: 'text-stone-300',
    navDescIdle: 'text-stone-500 group-hover:text-stone-600',
    fadeTop: 'from-white/80',
    fadeBottom: 'from-white/70',
    userCard: 'border-stone-200 bg-stone-50',
    userAvatar: 'bg-gold/20 text-gold-dark',
    userName: 'text-stone-900',
    userRole: 'text-stone-500',
    logout: 'text-stone-500 hover:bg-red-50 hover:text-red-600',
  },
};

/** Interruptor de color del sidebar (claro/oscuro). */
function SidebarThemeSwitch({ light, onToggle, theme, collapsed }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      onClick={onToggle}
      title={light ? 'Usar menú oscuro' : 'Usar menú claro'}
      aria-label={light ? 'Usar menú oscuro' : 'Usar menú claro'}
      className={`relative inline-flex h-7 w-[3.25rem] shrink-0 items-center rounded-full border transition-colors duration-300 ${theme.switchTrack} ${
        collapsed ? 'lg:h-6 lg:w-11' : ''
      }`}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5">
        <Moon size={12} className={light ? theme.switchIconIdle : 'text-gold'} aria-hidden />
        <Sun size={12} className={light ? 'text-gold-dark' : theme.switchIconIdle} aria-hidden />
      </span>
      <span
        className={`relative ml-0.5 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-transform duration-300 ${theme.switchKnob} ${
          collapsed ? 'lg:h-5 lg:w-5' : ''
        }`}
      >
        {light ? <Sun size={12} aria-hidden /> : <Moon size={12} aria-hidden />}
      </span>
    </button>
  );
}

function isActiveRoute(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavItem({ item, pathname, sidebarCollapsed, theme }) {
  const active = isActiveRoute(pathname, item.path);
  const Icon = item.Icon;

  return (
    <Link
      to={item.path}
      title={sidebarCollapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${
        active ? theme.navActive : theme.navIdle
      } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gold" aria-hidden />
      )}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
          active ? theme.navIconActive : theme.navIconIdle
        }`}
      >
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
        <span className="block truncate">{item.label}</span>
        <span
          className={`block truncate text-xs font-medium ${
            active ? theme.navDescActive : theme.navDescIdle
          }`}
        >
          {item.description}
        </span>
      </span>
    </Link>
  );
}

export default function AdminLayout({ children }) {
  const { user, logout, permissions } = useAuth();
  const { businessName } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  // La lista de barbero (Mis citas/Agenda/Historial) es fija y atada a ser barbero
  // de verdad (usa `user.barberId`); todo lo demás — incluido un rol personalizado
  // sin nombre "admin" — recibe la lista "admin", que luego se filtra por permiso.
  // Se ocultan los items que exigen un permiso que el usuario no tiene, y las
  // secciones que se quedan sin ningún item, para no dejar un encabezado huérfano.
  // Es solo cosmético: quien fuerce la URL se topa igualmente con ProtectedRoute y
  // con el backend.
  const navSections = useMemo(() => {
    const base = isBarber ? barberNavSections : adminNavSections;
    return base
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // `adminOnly` es para items cuya ruta todavía no migró a permisos
          // (Citas: su lógica interna sigue atada a isAdmin/isBarber/isClient).
          // Se mantienen visibles solo para `admin` literal, igual que antes.
          if (item.adminOnly) return isAdmin;
          return !item.permission || (permissions ?? []).includes(item.permission);
        }),
      }))
      .filter((section) => section.items.length > 0);
    // Se depende de `permissions` y no del helper `can`, que se recrea en cada
    // render y haria inutil el memo.
  }, [isAdmin, isBarber, permissions]);
  // Dashboard (como Citas) todavía no migró a permisos: su ruta sigue
  // reservada a admin/barber literal. Un rol personalizado no recibe este
  // item — antes ni siquiera llegaba a este componente, así que no hacía
  // falta el `null`; ahora que sí llega, mostrarlo sería un enlace muerto.
  const dashboardItem = isAdmin ? adminDashboardItem : isBarber ? barberDashboardItem : null;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Se lee una sola vez al montar (initializer perezoso): leer localStorage en
  // cada render sería un acceso síncrono innecesario en cada navegación.
  const [sidebarTheme, setSidebarTheme] = useState(readStoredSidebarTheme);
  const isLightSidebar = sidebarTheme === 'light';
  const theme = SIDEBAR_THEMES[isLightSidebar ? 'light' : 'dark'];
  // Un id que falte aquí quedaría como `undefined` y la sección arrancaría plegada,
  // así que esta lista debe cubrir todos los ids de adminNavSections/barberNavSections.
  const [openSections, setOpenSections] = useState(() => ({
    operation: true,
    commercial: true,
    supply: true,
    access: true,
    system: true,
  }));

  const activeItem =
    (dashboardItem && isActiveRoute(location.pathname, dashboardItem.path) ? dashboardItem : null) ||
    navSections.flatMap((section) => section.items).find((item) => isActiveRoute(location.pathname, item.path));

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

  /**
   * Cambia el color del sidebar y lo recuerda. El estado se actualiza aunque
   * falle el guardado (modo privado): que no se pueda persistir no es motivo
   * para que el botón no haga nada en esta sesión.
   */
  const toggleSidebarTheme = () => {
    setSidebarTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(SIDEBAR_THEME_KEY, next);
      } catch {
        /* almacenamiento no disponible: la preferencia dura solo esta sesión */
      }
      return next;
    });
  };

  const toggleSection = (sectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  };

  const userInitial = (user?.firstName || user?.email || 'U').trim().charAt(0).toUpperCase();

  /**
   * Con el menú móvil abierto se bloquea el scroll del documento: el sidebar es
   * `fixed` y sin este bloqueo el contenido de detrás sigue desplazándose bajo
   * el overlay, que es justo el "scroll donde no debería" en pantallas chicas.
   */
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-stone-100">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-stone-950/65 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Cerrar menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden shadow-2xl transition-all duration-500 ease-out ${theme.aside} ${
          sidebarCollapsed ? 'lg:w-[5.75rem]' : 'lg:w-72'
        } ${mobileSidebarOpen ? 'w-[19rem] translate-x-0' : 'w-[19rem] -translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden />

        <div className={`relative border-b px-4 py-5 ${theme.divider}`}>
          <div className={`pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl ${theme.glow}`} />

          {/* Barra de controles del propio menú, por encima del nombre de la
              empresa: contraer/expandir y el color del sidebar. Antes el
              contraer estaba escondido en el logotipo, que no se lee como un
              botón y además mostraba un icono decorativo. */}
          <div
            className={`relative mb-4 flex items-center gap-2 ${
              sidebarCollapsed ? 'lg:flex-col lg:gap-3' : 'justify-between'
            }`}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`hidden rounded-xl border p-2 transition lg:inline-flex ${theme.divider} ${theme.iconButton}`}
              title={sidebarCollapsed ? 'Expandir menu' : 'Contraer menu'}
              aria-label={sidebarCollapsed ? 'Expandir menu' : 'Contraer menu'}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={18} strokeWidth={1.8} />
              ) : (
                <PanelLeftClose size={18} strokeWidth={1.8} />
              )}
            </button>

            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'lg:flex-col' : ''}`}>
              <SidebarThemeSwitch
                light={isLightSidebar}
                onToggle={toggleSidebarTheme}
                theme={theme}
                collapsed={sidebarCollapsed}
              />
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className={`rounded-xl p-2 transition lg:hidden ${theme.iconButton}`}
                aria-label="Cerrar menu"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className={`relative ${sidebarCollapsed ? 'lg:flex lg:justify-center' : ''}`}>
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl border font-serif text-lg font-bold ${theme.brandBox}`}
              aria-hidden
            >
              {(businessName || 'M').trim().charAt(0).toUpperCase()}
            </span>
            <span className={`${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <span className={`mt-3 block h-px w-8 ${theme.brandRule}`} />
              <span
                className={`mt-2 block truncate font-serif text-xl font-medium tracking-tight ${theme.brandText}`}
              >
                {businessName}
              </span>
              <span className={`mt-1 block text-xs ${theme.brandSubtitle}`}>
                {isAdmin ? 'Panel de administracion' : isBarber ? 'Panel del barbero' : 'Panel de personal'}
              </span>
            </span>
          </div>
        </div>

        <nav className="admin-sidebar-scroll relative flex-1 overflow-y-auto px-3 py-4">
          <div
            className={`pointer-events-none sticky top-0 z-10 -mb-2 h-2 bg-gradient-to-b to-transparent ${theme.fadeTop}`}
          />

          {dashboardItem ? (
            <div className="mb-4">
              <NavItem
                item={dashboardItem}
                pathname={location.pathname}
                sidebarCollapsed={sidebarCollapsed}
                theme={theme}
              />
            </div>
          ) : null}

          {navSections.map((section) => {
            const sectionActive = section.items.some((item) => isActiveRoute(location.pathname, item.path));
            const isOpen = sidebarCollapsed || openSections[section.id];

            return (
              <div key={section.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    sectionActive ? theme.sectionActive : theme.sectionIdle
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
                    {section.items.map((item) => (
                      <li key={item.path}>
                        <NavItem
                          item={item}
                          pathname={location.pathname}
                          sidebarCollapsed={sidebarCollapsed}
                          theme={theme}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          <div
            className={`pointer-events-none sticky bottom-0 -mt-2 h-2 bg-gradient-to-t to-transparent ${theme.fadeBottom}`}
          />
        </nav>

        <div className={`border-t p-3 ${theme.divider}`}>
          <div className={`mb-2 rounded-xl border p-3 ${theme.userCard} ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${theme.userAvatar}`}
              >
                {userInitial}
              </span>
              <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <p className={`truncate text-sm font-semibold ${theme.userName}`} title={user?.email}>
                  {user?.firstName || user?.email}
                </p>
                <p className={`truncate text-xs ${theme.userRole}`}>
                  {isAdmin ? 'Administrador' : isBarber ? 'Barbero' : user?.role}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-1">
            <button
              type="button"
              onClick={handleLogout}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${theme.logout} ${
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

      {/*
        Hasta `lg` el panel usa el scroll natural del documento: en móvil/tablet la
        combinación `h-screen` + `overflow-hidden` + `<main>` con scroll propio creaba
        un contenedor de scroll anidado que la barra de direcciones del navegador
        recortaba (100vh > alto visible), dejando el pie del contenido inalcanzable.
        Desde `lg`, donde el sidebar es fijo y no hay chrome variable, se recupera la
        columna de alto completo con scroll interno.
      */}
      <div
        className={`flex min-h-[100dvh] min-w-0 flex-col transition-[margin] duration-500 lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden ${
          sidebarCollapsed ? 'lg:ml-[5.75rem]' : 'lg:ml-72'
        }`}
      >
        <header className="sticky top-0 z-20 shrink-0 border-b border-stone-200 bg-white/90 px-3 py-2 shadow-card backdrop-blur sm:px-5 lg:static">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-700 shadow-sm transition hover:border-gold/50 hover:text-stone-950 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            {/* Único lugar donde se escribe el nombre del módulo. Las páginas NO
                deben repetirlo en su PageHeader: hacerlo dejaba el título dos
                veces seguidas (pasaba en Gastos, Inventario y Satisfacción). */}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
                {isBarber ? 'Operacion' : 'Administracion'}
              </p>
              <h2 className="truncate font-serif text-xl font-medium leading-tight tracking-tight text-stone-900 sm:text-2xl">
                {activeItem?.label || businessName}
              </h2>
            </div>
          </div>
        </header>

        <main className="admin-content-scroll flex w-full min-w-0 flex-1 flex-col overflow-x-hidden p-3 sm:p-4 md:p-5 lg:overflow-y-auto">
          {/* [DESACTIVADO-REPORTES-CAJA 2026-08-12] Al no montar CashRegisterProvider desaparecen
              el banner de caja, el FAB, los modales de abrir/cerrar y el polling cada 30s a
              GET /cash-registers/current. Los consumidores usan useCashRegisterOptional(), que
              devuelve null, por lo que nada revienta en runtime.
              Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md — para reactivar, restaurar
              la línea comentada y borrar la de abajo.
              {isAdmin ? <CashRegisterProvider>{children}</CashRegisterProvider> : children} */}
          {children}
        </main>
      </div>
    </div>
  );
}
