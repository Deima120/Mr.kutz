# Mr. Kutz

Sistema de gestión para barbería: landing pública, reservas en línea, panel administrativo, vistas para barberos y clientes, e **API REST** (incluye contrato móvil en `backend/docs/API_MOBILE.md`).

---

## Estructura del repositorio

En la raíz solo viven **`backend/`**, **`frontend/`** y este **`README.md`**.  
Los archivos ocultos de Git (`.gitignore`, `.gitattributes`) permanecen en la raíz por convención.

```
Mr.kutz/
├── backend/                 # API Node.js + Prisma + PostgreSQL
│   ├── docs/
│   │   ├── API_MOBILE.md    # Contrato API para app móvil (Flutter)
│   │   └── SEGUIMIENTO.md   # Automatización, backlog y pendientes
│   ├── prisma/              # schema, migraciones, seed
│   ├── scripts/             # create-admin, correo, limpieza demo
│   ├── src/                 # Express: routes → controllers → services
│   ├── render.yaml          # Plantilla deploy Render (API + cron)
│   └── package.json
├── frontend/                # React 18 + Vite 8 + Tailwind
│   ├── public/              # Assets estáticos, modelos 3D, imágenes
│   ├── src/features/        # Módulos por dominio (citas, pagos, etc.)
│   ├── src/shared/          # Componentes, contextos, API client
│   ├── vercel.json          # SPA rewrites para Vercel
│   └── package.json
└── README.md
```

### Documentación adicional (dentro de cada carpeta)

| Archivo | Ubicación |
|---------|-----------|
| API móvil detallada | `backend/docs/API_MOBILE.md` |
| Seguimiento / backlog | `backend/docs/SEGUIMIENTO.md` |
| Variables de entorno API | `backend/.env.example` |
| Galería de cortes | `frontend/CORTES-README.md` |
| Modelos 3D (GLTF) | `frontend/GLTF-README.md` |
| Auditorías npm | `backend/backend-audit.json`, `frontend/frontend-audit.json` |

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, Vite 8, React Router 6, Axios, Tailwind CSS |
| **Backend** | Node.js 18+, Express 4, ES modules |
| **Base de datos** | PostgreSQL + Prisma 5 |
| **Auth** | JWT, bcryptjs |
| **Validación** | express-validator (API), utilidades en frontend |

---

## Inicio rápido (desarrollo local)

Necesitas **dos terminales**: una para la API (puerto **5000**) y otra para la web (puerto **5173**).

### 1. Base de datos

Crea una instancia PostgreSQL ([Neon](https://neon.tech) recomendado) y copia la URL de conexión.

### 2. Backend

```bash
cd backend
npm install
```

Copia `backend/.env.example` → `backend/.env` y configura al menos:

- `DATABASE_URL`
- `JWT_SECRET` (cadena larga y aleatoria)

Aplicar esquema (elige una opción):

```bash
npx prisma migrate deploy   # BD vacía con historial de migraciones
npx prisma generate
# Si migrate deploy falla con P3005 (BD no vacía):
# npx prisma db push && npx prisma generate
```

Datos iniciales y administrador:

```bash
npm run db:seed
# En .env: ADMIN_EMAIL y ADMIN_PASSWORD
npm run create-admin
```

Arrancar API:

```bash
npm run dev
```

Comprobar: [http://localhost:5000/health](http://localhost:5000/health)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). En desarrollo, Vite hace proxy de `/api` → `http://localhost:5000` (no hace falta `VITE_API_URL` en local).

> En **PowerShell** ejecuta los comandos por separado; evita encadenar con `&&`.

---

## Roles y acceso

| Rol | Panel | Notas |
|-----|-------|-------|
| **admin** | Completo | Clientes, servicios, barberos, pagos, inventario, reportes |
| **barber** | Dashboard, citas, agenda, historial | API de pagos disponible; UI de pagos solo admin |
| **client** | Citas propias, perfil, valoraciones | Registro público en `/register` |

Reserva sin cuenta: **`/reservar`** (catálogo público + slots).

---

## API REST (resumen)

Base: `http://localhost:5000/api` · Formato: `{ success, data }` o `{ success, message }`

| Módulo | Prefijo | Auth |
|--------|---------|------|
| Auth | `/api/auth` | Login, registro, perfil, reset contraseña |
| Citas | `/api/appointments` | Público: satisfacción, reserva; auth: CRUD, slots, ratings |
| Clientes | `/api/clients` | Solo **admin** |
| Servicios / Barberos | `/api/services`, `/api/barbers` | GET público o por rol |
| Pagos | `/api/payments` | Admin y barber (anulación con `POST /:id/void`) |
| Productos / Compras | `/api/products`, `/api/purchases` | Admin (inventario) |
| Dashboard | `/api/dashboard` | Admin y barber |
| Settings | `/api/settings` | Solo lectura pública (`GET /public`) |
| Mobile | `/api/mobile` | App cliente — ver `backend/docs/API_MOBILE.md` |

Detalle de endpoints: secciones ampliadas en commits anteriores del README; para móvil usar **`backend/docs/API_MOBILE.md`**.

---

## Frontend (resumen)

- **Entrada:** `frontend/src/index.js` → `App.js` → `routes.js` (lazy loading).
- **Layouts:** `MainLayout` (público/cliente) · `AdminLayout` (admin/barber con sidebar).
- **Auth:** `AuthContext` + token en `localStorage` · cliente Axios en `shared/services/api.js`.
- **Landing:** hero 3D, servicios, galería, satisfacción (`public-satisfaction`), ubicación desde settings.

Rutas protegidas con `ProtectedRoute` y roles en `routes.js`.

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
| `npm run remove-demo-users` | Limpiar cuentas demo antiguas |
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

### Backend (Render u otro)

Variables mínimas: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL` (HTTPS).

Comando de arranque recomendado:

```bash
npm ci && npx prisma generate && npx prisma migrate deploy && npm start
```

Plantilla: `backend/render.yaml` (incluye cron de estados de citas cada 5 min).  
Health check: `GET /health`

### Frontend (Vercel / Netlify)

- **Root del proyecto en el host:** carpeta `frontend/`
- Variable de build: `VITE_API_URL=https://tu-api.com/api`
- Build: `npm ci && npm run build` · salida: `dist/`
- Config SPA: `frontend/vercel.json`

### Orden recomendado

1. PostgreSQL + migraciones  
2. Deploy backend → anotar URL del API  
3. Deploy frontend con `VITE_API_URL`  
4. Actualizar `FRONTEND_URL` en backend (CORS) y redesplegar si hace falta  

---

## Estado del proyecto y pendientes

Consulta **`backend/docs/SEGUIMIENTO.md`** para:

- Automatización de estados de citas (implementada)
- Correos transaccionales
- Backlog: recordatorios pre-cita, alertas de stock, settings admin, etc.

---

## Licencia

MIT
