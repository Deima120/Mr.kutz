<div align="center">

# Mr. Kutz

**Sistema de gestión para barberías** — landing pública, reservas en línea, panel administrativo, roles (admin / barbero / cliente) y API REST con contrato móvil.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](backend/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

<br />

[![Sitio en vivo](https://img.shields.io/badge/🌐_Sitio-mrkutz.vercel.app-8B5CF6?style=for-the-badge)](https://mrkutz.vercel.app)
[![API](https://img.shields.io/badge/⚡_API-Render-46E3B7?style=for-the-badge)](https://mrkutz-backend.onrender.com/health)

<br />

[Demo en vivo](https://mrkutz.vercel.app) · [Reservar cita](https://mrkutz.vercel.app/reservar) · [API health](https://mrkutz-backend.onrender.com/health) · [Docs móvil](backend/docs/API_MOBILE.md)

</div>

---

## Características

| Módulo | Descripción |
|--------|-------------|
| **Landing** | Hero 3D, servicios, galería, testimonios y ubicación |
| **Reservas** | Agendamiento público (`/reservar`) y panel de citas |
| **Panel admin** | Clientes, barberos, servicios, pagos, **caja diaria**, inventario, compras |
| **Caja diaria** | Apertura / cierre por día Colombia; cobros y otros ingresos ligados a caja OPEN; banner + bloqueo de cobro sin caja |
| **Pagos** | Cobro de citas/productos, **pago mixto** (`PaymentMethodSplit`), vuelto en efectivo |
| **Dashboard / Reportes** | Resumen KPI + 7 historiales (ventas, caja, inventario, gastos, otros ingresos, comisiones, cartera) |
| **Gastos** | Gastos operativos manuales con categorías editables (adjunto de comprobante pendiente) |
| **Otros ingresos** | Ingresos fuera de ventas (p. ej. alquiler de silla); exigen caja OPEN; efectivo suma a `expectedCash` |
| **Comisiones** | % por barbero (+ default en settings); snapshot al cobrar líneas de servicio |
| **Cartera** | Citas `completed` sin cobro vigente (sin crédito/fiado) |
| **Auth** | JWT, registro, recuperación de contraseña, roles |
| **API móvil** | Endpoints documentados para app Flutter |

---

## Caja diaria y Reportes (detalle)

### Caja (`CashRegister`)

- Una sesión por `businessDate` (día civil Colombia); estados `OPEN` / `CLOSED`.
- **Cobrar** y **registrar otro ingreso** requieren caja OPEN; si es de un día anterior → aviso `STALE`.
- Efectivo esperado = base de apertura + splits en efectivo de cobros + otros ingresos en efectivo.
- Al cerrar: efectivo contado opcional, diferencia vs esperado (UI: cuadra / sobra / falta); no cierra si hay citas completed sin cobro.
- Admin UI: banner POS en layout (base / esperado / cobrado + Ver caja), modales abrir/cerrar, bloqueo en formulario de cobro.
- Estado en vivo: `GET /current` incluye `summary`; el contexto admin hace **polling cada 30 s** (pausa si la pestaña está oculta) y **refresh inmediato** tras cobro o anulación.
- Reportes → Caja: panel **Caja en vivo** (métricas + desglose por método) encima del historial; historial con badges Abierta / Cerrada / Sin cerrar + **Ver detalle**.

Archivos clave FE: `frontend/src/features/cash-registers/` · paneles: `frontend/src/features/reports/panels/CashHistoryReport.jsx`, `components/CashLivePanel.jsx`.

### Reportes (admin `/reports?section=…`)

| Sección | `section=` | Fuente |
|---------|------------|--------|
| Resumen | _(default)_ | `/dashboard` |
| Historial de Ventas | `sales` | `/payments` |
| Historial de Caja | `cash` | `/cash-registers/history` (+ summary por id) |
| Inventario | `inventory` | `/products` |
| Gastos | `expenses` | `/expenses` |
| Otros ingresos | `other-incomes` | `/other-incomes` |
| Comisiones | `commissions` | `/commissions` |
| Cartera | `portfolio` | `/portfolio` |

Frontend: `frontend/src/features/reports/` (nav + paneles) · caja: `frontend/src/features/cash-registers/` · APIs de apoyo: `expenses/`, `other-incomes/`, `commissions/`, `portfolio/`.

### Migraciones relacionadas

| Migración | Contenido |
|-----------|-----------|
| `20260729180000_cash_registers` | Tabla `cash_registers`, `payments.cash_register_id` |
| `20260729210000_reports_expenses_incomes_commissions` | Gastos, otros ingresos, comisiones, `%` barbero / default settings |

> **Convención del proyecto:** antes de cada commit, actualizar este README (tabla de módulos, API y comandos) con lo que se agregó o cambió en backend/frontend.

---

## Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, Vite 8, React Router 6, Axios, Tailwind CSS, Three.js |
| **Tipografía web** | Google Fonts: **Libre Baskerville** (`font-serif`, títulos/montos) + **Source Sans 3** (`font-sans`, UI/body). Carga en `frontend/index.html` (`preconnect` + `display=swap`). |
| **Tipografía correos** | Georgia / Times New Roman en `backend/src/lib/mailer.js` (serif de sistema; sin web fonts en email) |
| **Backend** | Node.js 18+, Express 4, ES modules |
| **Base de datos** | PostgreSQL + Prisma 5 |
| **Auth** | JWT, bcryptjs |
| **Deploy** | Vercel (web) · Render (API + cron) · Neon (PostgreSQL) |

Tokens Tailwind: `font-serif` / `font-sans` en `frontend/tailwind.config.js`. Libre Baskerville en Google Fonts solo expone pesos 400/700; el CSS mapea `font-medium`→400 y `font-semibold`/`bold`→700 sobre `.font-serif` (`frontend/src/shared/styles/index.css`).

---

## Estructura del repositorio

```
Mr.kutz/
├── backend/                 # API Node.js + Prisma + PostgreSQL
├── frontend/                # React 18 + Vite 8 + Tailwind
└── README.md
```

Detalle interno de cada carpeta: `backend/docs/`, `backend/prisma/`, `backend/src/`, `frontend/src/features/`, etc.

### Documentación adicional

| Archivo | Ubicación |
|---------|-----------|
| API móvil detallada | [`backend/docs/API_MOBILE.md`](backend/docs/API_MOBILE.md) |
| Variables de entorno API | [`backend/.env.example`](backend/.env.example) |
| Variables frontend | [`frontend/.env.example`](frontend/.env.example) |
| Galería de cortes | [`frontend/CORTES-README.md`](frontend/CORTES-README.md) |
| Modelos 3D (GLTF) | [`frontend/GLTF-README.md`](frontend/GLTF-README.md) |
| Sistema de avisos (toast / confirm / banners) | [`frontend/docs/FEEDBACK.md`](frontend/docs/FEEDBACK.md) |

---

## Inicio rápido (desarrollo local)

Necesitas **dos terminales**: API en puerto **5000** y web en **5173**.

### 1. Base de datos

Crea una instancia PostgreSQL ([Neon](https://neon.tech) recomendado) y copia la URL de conexión.

### 2. Backend

```bash
cd backend
npm install
```

Copia `backend/.env.example` → `backend/.env` y configura al menos `DATABASE_URL` y `JWT_SECRET`.

```bash
npx prisma migrate deploy
npx prisma generate
npm run db:seed
npm run create-admin
npm run dev
```

Health check: [http://localhost:5000/health](http://localhost:5000/health)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). En desarrollo, Vite hace proxy de `/api` → `http://localhost:5000`.

> En **PowerShell** ejecuta los comandos por separado; evita encadenar con `&&`.

---

## Roles y acceso

| Rol | Panel | Notas |
|-----|-------|-------|
| **admin** | Completo | Clientes, servicios, barberos, pagos, **caja**, inventario, **reportes** (7 secciones), gastos / otros ingresos / comisiones / cartera |
| **barber** | Dashboard, citas, agenda, historial | API de pagos disponible; UI de pagos solo admin |
| **client** | Citas propias, perfil, valoraciones | Registro en `/register` |

Reserva sin cuenta: [`/reservar`](https://mrkutz.vercel.app/reservar).

---

## API REST (resumen)

| Módulo | Prefijo | Auth / notas |
|--------|---------|--------------|
| Auth | `/api/auth` | Login, registro, perfil, reset contraseña |
| Citas | `/api/appointments` | Público + auth (CRUD, slots, ratings) |
| Clientes | `/api/clients` | Solo **admin** |
| Servicios / Barberos | `/api/services`, `/api/barbers` | GET público o por rol; barbero admite `commissionPercent` |
| Pagos | `/api/payments` | Solo **admin** — cobro exige caja OPEN; splits mixtos |
| Caja | `/api/cash-registers` | Solo **admin** — `current` (incluye `summary` en vivo), `open`, `close`, `history`, `/:id/summary` |
| Gastos | `/api/expenses` | Solo **admin** — CRUD + categorías (`/expenses/categories`) |
| Otros ingresos | `/api/other-incomes` | Solo **admin** — exige caja OPEN |
| Comisiones | `/api/commissions` | Solo **admin** — listado / totales (snapshots al cobrar) |
| Cartera | `/api/portfolio` | Solo **admin** — citas completed sin cobro |
| Productos / Compras | `/api/products`, `/api/purchases` | Admin (inventario) |
| Dashboard | `/api/dashboard` | Admin y barber |
| Settings | `/api/settings` | Lectura pública (`GET /public`); default de comisión |
| Mobile | `/api/mobile` | App cliente — ver [`API_MOBILE.md`](backend/docs/API_MOBILE.md) |

Producción: `https://mrkutz-backend.onrender.com/api` · Formato: `{ success, data }` o `{ success, message }` (errores pueden incluir `reason` / `details`).

---

## Comandos útiles

### Backend (`cd backend`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | API con hot reload |
| `npm run start` | Producción |
| `npm run db:seed` | Roles, métodos de pago, servicios, settings |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run create-admin` | Crear/actualizar administrador |
| `npm run cash:verify-schema` | Verifica tablas/columnas de caja |
| `npm run cash:smoke` | Smoke caja (abrir → cobrar → resumen → cerrar) |
| `npm run payments:smoke-splits` | Smoke pago mixto (abre/reabre caja si hace falta) |
| `npm test` | Suite unitaria (helpers caja, gastos, ingresos, comisiones, pagos, etc.) |
| `npm run cron:appointment-status` | Sincronizar estados de citas (cron) |
| `npm run db:studio` | Prisma Studio |

### Frontend (`cd frontend`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo (5173) |
| `npm run build` | Build producción → `dist/` |
| `npm run preview` | Previsualizar build |

---

## Despliegue

| Servicio | Plataforma | URL |
|----------|------------|-----|
| Web | Vercel (`frontend/`) | [mrkutz.vercel.app](https://mrkutz.vercel.app) |
| API | Render | [mrkutz-backend.onrender.com](https://mrkutz-backend.onrender.com) |
| BD | Neon PostgreSQL | Configurar `DATABASE_URL` |

**Backend** — comando de arranque recomendado:

```bash
npm ci && npx prisma generate && npx prisma migrate deploy && npm start
```

**Frontend** — variable de build: `VITE_API_URL=https://mrkutz-backend.onrender.com/api`

Plantillas: [`backend/render.yaml`](backend/render.yaml) · [`frontend/vercel.json`](frontend/vercel.json)


## Integrantes del equipo
- [Emanuel Garcia Vanegas] - [Backend]
- [Adrian Aguirre Jaimes] - [Frontend]
- [Sebastian Arenas Vasquez] - [Tester]
- [Juan Manuel Quiroz] - [Bases de datos]
- [Emmanuel Echeverry] - [Fullstack]
---

## Licencia

[MIT](backend/LICENSE) © 2026 Mr. Kutz
