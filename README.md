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
| **Panel admin** | Clientes, barberos, servicios, pagos, inventario, compras |
| **Dashboard** | Métricas y reportes exportables (Excel / PDF) |
| **Auth** | JWT, registro, recuperación de contraseña, roles |
| **API móvil** | Endpoints documentados para app Flutter |

---

## Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, Vite 8, React Router 6, Axios, Tailwind CSS, Three.js |
| **Backend** | Node.js 18+, Express 4, ES modules |
| **Base de datos** | PostgreSQL + Prisma 5 |
| **Auth** | JWT, bcryptjs |
| **Deploy** | Vercel (web) · Render (API + cron) · Neon (PostgreSQL) |

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
| **admin** | Completo | Clientes, servicios, barberos, pagos, inventario, reportes |
| **barber** | Dashboard, citas, agenda, historial | API de pagos disponible; UI de pagos solo admin |
| **client** | Citas propias, perfil, valoraciones | Registro en `/register` |

Reserva sin cuenta: [`/reservar`](https://mrkutz.vercel.app/reservar).

---

## API REST (resumen)

| Módulo | Prefijo | Auth |
|--------|---------|------|
| Auth | `/api/auth` | Login, registro, perfil, reset contraseña |
| Citas | `/api/appointments` | Público + auth (CRUD, slots, ratings) |
| Clientes | `/api/clients` | Solo **admin** |
| Servicios / Barberos | `/api/services`, `/api/barbers` | GET público o por rol |
| Pagos | `/api/payments` | Admin y barber |
| Productos / Compras | `/api/products`, `/api/purchases` | Admin (inventario) |
| Dashboard | `/api/dashboard` | Admin y barber |
| Settings | `/api/settings` | Lectura pública (`GET /public`) |
| Mobile | `/api/mobile` | App cliente — ver [`API_MOBILE.md`](backend/docs/API_MOBILE.md) |

Producción: `https://mrkutz-backend.onrender.com/api` · Formato: `{ success, data }` o `{ success, message }`.

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

---

## Licencia

[MIT](backend/LICENSE) © 2026 Mr. Kutz
