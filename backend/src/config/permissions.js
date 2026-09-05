/**
 * Catálogo de permisos del sistema y qué recibe cada rol de fábrica.
 *
 * Este archivo es la **fuente de verdad**. La tabla `permissions` de la base se
 * siembra desde aquí (`prisma/seed.js`), no al revés: un permiso que no exista en
 * este catálogo no lo consulta ningún código, así que crearlo desde el panel no
 * haría nada. Por eso los permisos no se crean por API.
 *
 * ## Cómo se derivó
 *
 * Cada código sale de lo que ya protegía `authorize(...)` en `src/routes/` antes
 * de existir este módulo. `ROLE_PRESETS` reproduce **exactamente** los accesos que
 * tenían `admin`, `barber` y `client`, de modo que sembrar permisos no cambia el
 * comportamiento de nadie. Si algún día se quiere cambiar quién puede qué, se hace
 * desde la pantalla de Roles, no tocando este archivo.
 *
 * ## Convención de nombres
 *
 * `modulo.accion`, y cuando la acción distingue alcance, `modulo.accion.alcance`
 * (`appointments.view.all` frente a `appointments.view.own`).
 */

/** Los tres roles originales. Son la base del flujo y no se borran ni renombran. */
export const ROLES = {
  ADMIN: 'admin',
  BARBER: 'barber',
  CLIENT: 'client',
};

export const SYSTEM_ROLE_NAMES = [ROLES.ADMIN, ROLES.BARBER, ROLES.CLIENT];

/** Etiquetas legibles de cada módulo, para agrupar las casillas en la pantalla de Roles. */
export const MODULE_LABELS = {
  appointments: 'Citas',
  clients: 'Clientes',
  barbers: 'Barberos',
  services: 'Servicios',
  service_categories: 'Categorías de servicio',
  payments: 'Ventas',
  purchases: 'Compras',
  suppliers: 'Proveedores',
  inventory: 'Inventario',
  product_categories: 'Categorías de producto',
  cash_register: 'Caja',
  expenses: 'Gastos',
  other_incomes: 'Otros ingresos',
  commissions: 'Comisiones',
  dashboard: 'Panel',
  testimonials: 'Satisfacción',
  portfolio: 'Portafolio',
  users: 'Usuarios',
  roles: 'Roles y permisos',
};

/**
 * @typedef {{ code: string, module: string, description: string }} PermissionDef
 * @type {PermissionDef[]}
 */
export const PERMISSIONS = [
  // --- Citas -------------------------------------------------------------
  { code: 'appointments.view.all', module: 'appointments', description: 'Ver todas las citas de la barbería' },
  { code: 'appointments.view.own', module: 'appointments', description: 'Ver únicamente sus propias citas' },
  { code: 'appointments.create', module: 'appointments', description: 'Agendar citas' },
  { code: 'appointments.update', module: 'appointments', description: 'Editar, confirmar o cancelar citas' },
  { code: 'appointments.rate', module: 'appointments', description: 'Valorar una cita ya atendida' },
  { code: 'appointments.rating_summary', module: 'appointments', description: 'Ver el resumen de valoraciones' },

  // --- Clientes ----------------------------------------------------------
  { code: 'clients.view', module: 'clients', description: 'Consultar la base de clientes' },
  { code: 'clients.manage', module: 'clients', description: 'Crear, editar, activar y eliminar clientes' },

  // --- Barberos ----------------------------------------------------------
  { code: 'barbers.view', module: 'barbers', description: 'Ver el equipo de barberos y sus horarios' },
  { code: 'barbers.manage', module: 'barbers', description: 'Crear, editar y eliminar barberos' },
  { code: 'barbers.schedules.manage', module: 'barbers', description: 'Modificar los horarios de los barberos' },

  // --- Servicios ---------------------------------------------------------
  // La lectura de servicios es pública (la usa la landing), por eso no hay
  // `services.view`: no habría nada que proteger.
  { code: 'services.manage', module: 'services', description: 'Crear, editar y eliminar servicios' },
  { code: 'service_categories.manage', module: 'service_categories', description: 'Gestionar las categorías de servicio' },

  // --- Dinero ------------------------------------------------------------
  { code: 'payments.view', module: 'payments', description: 'Consultar las ventas registradas' },
  { code: 'payments.manage', module: 'payments', description: 'Registrar y anular ventas' },
  { code: 'purchases.view', module: 'purchases', description: 'Consultar las órdenes de compra' },
  { code: 'purchases.manage', module: 'purchases', description: 'Crear órdenes de compra y registrar recepciones' },
  { code: 'suppliers.view', module: 'suppliers', description: 'Consultar los proveedores' },
  { code: 'suppliers.manage', module: 'suppliers', description: 'Crear y editar proveedores' },
  { code: 'cash_register.view', module: 'cash_register', description: 'Consultar las cajas' },
  { code: 'cash_register.manage', module: 'cash_register', description: 'Abrir y cerrar caja' },
  { code: 'expenses.view', module: 'expenses', description: 'Consultar los gastos' },
  { code: 'expenses.manage', module: 'expenses', description: 'Registrar y anular gastos' },
  { code: 'other_incomes.view', module: 'other_incomes', description: 'Consultar otros ingresos' },
  { code: 'other_incomes.manage', module: 'other_incomes', description: 'Registrar y anular otros ingresos' },
  { code: 'commissions.view', module: 'commissions', description: 'Consultar las comisiones' },
  { code: 'commissions.manage', module: 'commissions', description: 'Liquidar y ajustar comisiones' },

  // --- Inventario --------------------------------------------------------
  { code: 'inventory.view', module: 'inventory', description: 'Consultar productos y existencias' },
  { code: 'inventory.manage', module: 'inventory', description: 'Crear productos y ajustar existencias' },
  { code: 'product_categories.manage', module: 'product_categories', description: 'Gestionar las categorías de producto' },

  // --- Panel y contenido -------------------------------------------------
  { code: 'dashboard.view.all', module: 'dashboard', description: 'Ver el panel general del negocio' },
  { code: 'dashboard.view.own', module: 'dashboard', description: 'Ver únicamente su propio resumen diario' },
  { code: 'dashboard.report', module: 'dashboard', description: 'Ver el informe del panel' },
  { code: 'testimonials.manage', module: 'testimonials', description: 'Gestionar los testimonios publicados' },
  { code: 'portfolio.manage', module: 'portfolio', description: 'Gestionar el portafolio de trabajos' },

  // --- Sistema -----------------------------------------------------------
  { code: 'users.view', module: 'users', description: 'Ver los usuarios del personal' },
  { code: 'users.manage', module: 'users', description: 'Crear usuarios, cambiar su rol y activarlos o desactivarlos' },
  { code: 'roles.view', module: 'roles', description: 'Ver los roles y sus permisos' },
  { code: 'roles.manage', module: 'roles', description: 'Crear roles y asignarles permisos' },
];

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const ALL = PERMISSION_CODES;

/**
 * Permisos de fábrica de cada rol.
 *
 * **Reproducen el comportamiento anterior al módulo de permisos, sin añadir ni
 * quitar nada.** Dos accesos pueden sorprender y se conservan a propósito porque
 * así estaban:
 *
 *  - `barber` puede gestionar servicios: `service.routes.js` protegía la escritura
 *    con `authorize('admin', 'barber')`.
 *  - `client` puede ver barberos y sus horarios: lo necesita el asistente de
 *    reserva para elegir con quién agendar.
 */
export const ROLE_PRESETS = {
  [ROLES.ADMIN]: ALL,

  [ROLES.BARBER]: [
    'appointments.view.own',
    'appointments.update',
    'appointments.rating_summary',
    'barbers.view',
    'services.manage',
    'dashboard.view.own',
  ],

  [ROLES.CLIENT]: [
    'appointments.view.own',
    'appointments.create',
    'appointments.update',
    'appointments.rate',
    'barbers.view',
  ],
};

/** Comprobación de integridad: que ningún preset cite un permiso inexistente. */
export function assertPresetsAreValid() {
  const conocidos = new Set(PERMISSION_CODES);
  for (const [rol, codigos] of Object.entries(ROLE_PRESETS)) {
    for (const codigo of codigos) {
      if (!conocidos.has(codigo)) {
        throw new Error(`El rol "${rol}" cita un permiso que no existe en el catálogo: ${codigo}`);
      }
    }
  }
  return true;
}
