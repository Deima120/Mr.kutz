# Mr. Kutz

Sistema de gestión integral para barbería: reserva de citas, clientes, barberos, servicios, pagos, inventario y configuración. Incluye landing pública, panel de administración (web), vistas para barberos y clientes, y una **API REST para app móvil Flutter** (auth, disponibilidad y citas de cliente).

---

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Base de datos](#base-de-datos)
- [Backend](#backend)
- [API REST](#api-rest)
- [Frontend](#frontend)
- [Autenticación y roles](#autenticación-y-roles)
- [API para Flutter](#api-para-flutter)
- [Configuración e instalación](#configuración-e-instalación)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Comandos útiles](#comandos-útiles)

---

## Stack tecnológico

| Capa        | Tecnología |
|-------------|------------|
| **Frontend** | React 18, Vite 5, React Router 6, Axios, Tailwind CSS |
| **Backend**  | Node.js, Express 4, ES modules |
| **Base de datos** | PostgreSQL (compatible Neon u otro proveedor) |
| **ORM**      | Prisma 5 |
| **Auth**     | JWT (jsonwebtoken), bcryptjs |
| **Validación** | express-validator |

---

## Estructura del proyecto

```
Mr.kutz/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos y migraciones
│   │   └── seed.js          # Datos iniciales (roles, usuarios, servicios)
│   ├── src/
│   │   ├── config/          # Conexión BD (database.js), Prisma (lib/prisma.js)
│   │   ├── controllers/     # Lógica HTTP por recurso
│   │   ├── middlewares/    # auth, authorize, validation, errorHandler
│   │   ├── routes/         # Rutas API por módulo
│   │   ├── services/       # Lógica de negocio y acceso a BD
│   │   └── index.js        # Entrada del servidor
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reutilizables y landing (carousels, etc.)
│   │   ├── context/        # AuthContext, SettingsContext
│   │   ├── layouts/        # MainLayout (público/cliente), AdminLayout (admin/barber)
│   │   ├── pages/          # Páginas por módulo (clients, services, appointments…)
│   │   ├── services/       # Llamadas API (auth, barber, appointment…)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js      # Proxy /api → backend
│   └── package.json
└── README.md
```

---

## Base de datos

Se usa **PostgreSQL** con **Prisma** como ORM. El esquema se define en `backend/prisma/schema.prisma`.

Tras actualizar el esquema, desde `backend` ejecutar `npx prisma migrate deploy` (o `migrate dev` en local) y `npx prisma generate`.

### Modelos principales

| Modelo | Descripción |
|--------|-------------|
| **Role** | Roles del sistema: `admin`, `barber`, `client`. |
| **User** | Usuarios (email, password hash, roleId). Relacionado con Barber o Client según rol. |
| **Client** | Datos del cliente (nombre, teléfono, email, notas). Opcionalmente vinculado a User. |
| **Barber** | Datos del barbero (nombre, teléfono, especialidades, activo). Vinculado a User. |
| **BarberSchedule** | Horarios por barbero y día de la semana (0–6), hora inicio/fin. |
| **Service** | Catálogo de servicios (nombre, descripción, precio, duración, activo). |
| **Appointment** | Citas (cliente, barbero, servicio, fecha, hora inicio/fin, estado, notas, valoración opcional del cliente `clientRating` / comentario / fecha). |
| **Payment** | Pagos (monto, método, referencia, opcionalmente vinculado a cita). |
| **PaymentMethod** | Métodos de pago (efectivo, tarjeta, transferencia, etc.). |
| **Product** | Productos del inventario (nombre, SKU, unidad, stock mínimo). |
| **Inventory** | Stock actual por producto. |
| **InventoryMovement** | Movimientos de stock (entrada/salida/ajuste). |
| **BusinessSetting** | Configuración del negocio (nombre, colores, contacto, etc.). |
| **Testimonial** | Testimonios para la landing (autor, rol, contenido, orden, activo). |

### Relaciones clave

- **User** → **Role** (muchos a uno).
- **User** → **Barber** o **Client** (uno a uno según rol).
- **Appointment** → Client, Barber, Service (muchos a uno).
- **Barber** → **BarberSchedule** (uno a muchos).
- **Payment** → Appointment, PaymentMethod (opcional).
- **Product** → Inventory, InventoryMovement.

Tras cambiar el schema: `npm run db:push` (o migraciones). Datos iniciales: `npm run db:seed`.

---

## Backend

- **Entrada**: `backend/src/index.js`.
- **Framework**: Express con `express.json()`, CORS configurado (origen desde `FRONTEND_URL` o `http://localhost:5173`).
- **Montaje**: Todas las rutas API bajo el prefijo `/api` (ver [API REST](#api-rest)).
- **Health**: `GET /health` devuelve estado y timestamp.

### Middlewares

| Middleware | Ubicación | Función |
|------------|-----------|---------|
| **auth** | `middlewares/auth.js` | Verifica JWT en `Authorization: Bearer <token>`, carga usuario y rol (y `barber_id` o `client_id` si aplica). Responde 401 si no hay token o usuario inactivo. |
| **authorize(...roles)** | `middlewares/auth.js` | Comprueba que `req.user.role_name` esté en la lista de roles permitidos. Responde 403 si no. |
| **validate** | `middlewares/validation.js` | Procesa errores de `express-validator` y devuelve 400 con mensajes. |
| **errorHandler** | `middlewares/errorHandler.js` | Manejo global de errores (Prisma, JWT, etc.) y respuesta JSON. |

### Flujo de una petición

1. CORS y body parser.
2. Rutas `/api/*` → controlador correspondiente.
3. En rutas protegidas: `auth` → `authorize(roles)` → validación → controlador → servicio (Prisma) → respuesta JSON.

Los controladores delegan la lógica en **services** (por ejemplo `appointment.service.js`, `barber.service.js`). La conexión a la BD se hace con el cliente **Prisma** (`lib/prisma.js`).

---

## API REST

Base URL: `http://localhost:5000/api` (en desarrollo el frontend usa proxy `/api` → `http://localhost:5000`).

Formato de respuesta típico: `{ success: true, data: ... }` o `{ success: false, message: "..." }`.

### Resumen por módulo

| Módulo | Prefijo | Auth | Descripción |
|--------|---------|------|-------------|
| Raíz | `GET /api` | No | Info de la API y lista de endpoints. |
| Auth | `/api/auth` | Ver tabla | Registro, login, perfil. |
| Clientes | `/api/clients` | Admin, Barber | CRUD clientes e historial. |
| Servicios | `/api/services` | GET público; CRUD Admin/Barber | Catálogo para agendar y administrar. |
| Barberos | `/api/barbers` | Admin, Barber, Client (solo GET) | Listado y horarios para agendar; CRUD admin. |
| Citas | `/api/appointments` | Admin, Barber, Client | CRUD citas y slots disponibles. |
| Testimonios | `/api/testimonials` | GET público; CRUD Admin | Landing y panel de testimonios. |
| Pagos | `/api/payments` | Admin, Barber | CRUD pagos, métodos, totales. |
| Productos | `/api/products` | Admin, Barber | Inventario, stock bajo, movimientos. |
| Dashboard | `/api/dashboard` | Admin, Barber | Estadísticas. |
| Settings | `/api/settings` | GET auth; PUT Admin | Configuración del negocio. |
| Mobile | `/api/mobile` | Ver tabla | Login, perfil, disponibilidad y citas para cliente. |

### Detalle de endpoints

#### Auth (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register` | No | Registro (email, password, firstName, lastName, phone?, role?). Devuelve user + token. |
| POST | `/login` | No | Login (email, password). Devuelve user + token. |
| GET | `/me` | Sí (cualquier rol) | Perfil del usuario (incl. clientId/barberId si aplica). |

#### Clientes (`/api/clients`)

Todas las rutas requieren **auth** y **admin** o **barber**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista de clientes. |
| GET | `/:id` | Cliente por ID. |
| GET | `/:id/history` | Historial (citas) del cliente. |
| POST | `/` | Crear cliente. |
| PUT | `/:id` | Actualizar cliente. |
| DELETE | `/:id` | Eliminar cliente. |

#### Servicios (`/api/services`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Lista servicios (activos por defecto; `?active=false` incluye inactivos). |
| GET | `/:id` | No | Servicio por ID. |
| POST | `/` | Admin, Barber | Crear servicio. |
| PUT | `/:id` | Admin, Barber | Actualizar servicio. |
| DELETE | `/:id` | Admin, Barber | Eliminar servicio. |

#### Barberos (`/api/barbers`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | Admin, Barber, Client | Lista barberos. |
| GET | `/:id` | Admin, Barber, Client | Barbero por ID. |
| GET | `/:id/schedules` | Admin, Barber, Client | Horarios del barbero. |
| POST | `/` | Admin | Crear barbero (y usuario). |
| PUT | `/:id` | Admin | Actualizar barbero. |
| PUT | `/:id/schedules` | Admin | Actualizar horarios (array de { dayOfWeek, startTime, endTime, isAvailable }). |

#### Citas (`/api/appointments`)

Todas requieren **auth** y **admin**, **barber** o **client**. Los clientes solo pueden ver/modificar sus propias citas (y solo cancelar).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista citas (filtradas por rol: cliente = propias, barbero = suyas, admin = todas). |
| GET | `/slots` | Slots disponibles: query `barberId`, `date` (YYYY-MM-DD). |
| GET | `/rating-summary` | **Admin y barber.** Resumen de valoraciones de citas `completed` con `clientRating`. Query opcional: `barberId` (admin; el barbero solo ve el suyo), `days` (ej. `30`) o `all` sin límite de fechas. |
| GET | `/:id` | Cita por ID (comprobación de pertenencia por rol). |
| POST | `/` | Crear cita (`clientId` opcional si es cliente; se usa el del token). |
| POST | `/:id/rating` | **Solo client.** Body JSON: `{ "rating": 1-5, "comment"?: string }`. La cita debe estar `completed`, ser del cliente del token y no tener ya valoración. |
| PUT | `/:id` | Actualizar cita (client solo puede poner status `cancelled`). |

En listados y detalle de citas, cada ítem incluye (cuando aplica) en **camelCase**: `clientRating` (entero 1–5 o `null`), `clientRatingComment` (`null` o string), `clientRatedAt` (ISO 8601 o `null`). Son la única fuente de verdad compartida con la app móvil.

#### Testimonios (`/api/testimonials`)

Textos opcionales para la **landing** (carrusel), independientes de las valoraciones de citas anteriores.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Lista testimonios activos (por defecto). `?active=false` incluye inactivos. |
| GET | `/:id` | Admin | Testimonio por ID. |
| POST | `/` | Admin | Crear testimonio. |
| PUT | `/:id` | Admin | Actualizar testimonio. |
| DELETE | `/:id` | Admin | Eliminar testimonio. |

#### Pagos (`/api/payments`)

Todas requieren **auth** y **admin** o **barber**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/methods` | Métodos de pago activos. |
| GET | `/total` | Total pagos (filtros por query si existen). |
| GET | `/` | Lista pagos. |
| GET | `/:id` | Pago por ID. |
| POST | `/` | Registrar pago. |
| DELETE | `/:id` | Eliminar pago. |

#### Productos / Inventario (`/api/products`)

Todas requieren **auth** y **admin** o **barber**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista productos. |
| GET | `/low-stock` | Productos bajo stock mínimo. |
| GET | `/:id` | Producto por ID. |
| GET | `/:id/movements` | Movimientos de stock del producto. |
| POST | `/` | Crear producto. |
| PUT | `/:id` | Actualizar producto. |
| PUT | `/:id/stock` | Ajustar stock (quantityChange, movementType?, notes?). |
| DELETE | `/:id` | Eliminar producto. |

#### Dashboard (`/api/dashboard`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/stats` | Admin, Barber | Estadísticas (citas hoy, ingresos, etc.). |

#### Settings (`/api/settings`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/public` | No | Configuración pública (nombre del negocio, etc.) para landing. |
| GET | `/` | Cualquier autenticado | Configuración completa. |
| PUT | `/` | Admin | Actualizar configuración (business_name, logo_url, colores, contacto, etc.). |

#### Mobile (`/api/mobile`)

Para futura app móvil o cliente alternativo.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login (mismo contrato que `/api/auth/login`). |
| GET | `/auth/me` | Sí | Perfil. |
| GET | `/client/availability` | Client | Query `barberId`, `date` → slots disponibles. |
| GET | `/client/appointments` | Client | Citas del cliente (mismos campos `clientRating` / `clientRatingComment` / `clientRatedAt` que en `/api/appointments`). |
| POST | `/client/appointments` | Client | Crear cita (barberId, serviceId, appointmentDate, startTime?, notes?). |
| POST | `/client/appointments/:id/rating` | Client | Igual que `POST /api/appointments/:id/rating` (valoración única por cita completada). |

**Resumen agregado para barbero (y admin en panel web):** `GET /api/appointments/rating-summary` con token **barber** o **admin** (mismo contrato descrito arriba). La app móvil del barbero puede usar ese endpoint con base `https://<host>/api` (no hace falta prefijo `/mobile`).

---

## Frontend

- **Entrada**: `frontend/src/main.jsx` → `App.jsx`.
- **Build**: Vite 5, React 18, React Router 6.
- **Estilos**: Tailwind CSS (config en `tailwind.config.js`), tema barbería (colores `barber-dark`, `gold`, etc.).

### Rutas y layouts

- **MainLayout**: Envuelve todas las rutas. Si el usuario es **admin** o **barber**, redirige el contenido al **AdminLayout** (sidebar). Si no, muestra header público/cliente con enlaces a Inicio, Servicios, Testimonios, Ubicación, y (si está logueado) Mis citas y cerrar sesión.
- **AdminLayout**: Sidebar con navegación según rol:
  - **Admin**: Dashboard, Citas, Clientes, Servicios, Barberos, Testimonios, Pagos, Inventario, Reportes, Configuración.
  - **Barber**: Mi día (Dashboard), Mis citas, Agenda, Historial, Clientes (solo lectura).

Rutas principales:

| Ruta | Acceso | Página |
|------|--------|--------|
| `/` | Público | Landing (HomePage). Si ya es admin/barber → redirect a `/dashboard`. |
| `/login`, `/register` | Público | Login y registro. |
| `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit` | Admin (barber solo lista/detalle) | Clientes. |
| `/services`, `/services/new`, `/services/:id/edit` | Admin | Servicios. |
| `/barbers`, `/barbers/new`, `/barbers/:id/schedules`, `/barbers/:id/edit` | Admin | Barberos. |
| `/appointments`, `/appointments/new` | Admin, Barber, Client | Citas. |
| `/payments`, `/payments/new` | Admin | Pagos. |
| `/inventory`, `/inventory/new`, `/inventory/:id/edit` | Admin | Inventario. |
| `/dashboard` | Admin, Barber | Dashboard. |
| `/agenda`, `/history` | Barber | Agenda semanal e historial de servicios. |
| `/reports` | Admin | Reportes. |
| `/settings` | Admin | Configuración. |
| `/testimonials`, `/testimonials/new`, `/testimonials/:id/edit` | Admin | Testimonios. |

La protección se hace con **ProtectedRoute** (componente que comprueba `allowedRoles` y redirige a login o home si no cumple).

### Contextos

- **AuthContext**: Login, registro, logout, usuario actual (`user`), `isAuthenticated`, y carga del perfil (incl. `clientId`/`barberId`) tras login/register.
- **SettingsContext**: Carga configuración pública (p. ej. nombre del negocio) desde `GET /api/settings/public` para mostrar en header y landing.

### Servicios (llamadas API)

Todos usan el cliente **Axios** definido en `src/services/api.js`:

- **baseURL**: `import.meta.env.VITE_API_URL` o `'/api'`.
- **Interceptor request**: Añade `Authorization: Bearer <token>` si hay token en `localStorage`.
- **Interceptor response**: Devuelve `response.data`; en 401 limpia token y redirige a `/login`.

Archivos en `src/services/`:

| Archivo | Uso |
|---------|-----|
| `api.js` | Cliente Axios compartido. |
| `authService.js` | login, register, getProfile. |
| `clientService.js` | CRUD clientes, historial. |
| `serviceService.js` | CRUD servicios (getServices usado en landing y formulario de citas). |
| `barberService.js` | CRUD barberos, getSchedules. |
| `appointmentService.js` | CRUD citas, getAvailableSlots. |
| `testimonialService.js` | CRUD testimonios (getTestimonials en landing). |
| `paymentService.js` | Pagos y métodos de pago. |
| `productService.js` | Productos, stock, movimientos. |
| `dashboardService.js` | Estadísticas. |
| `settingsService.js` | Configuración pública y completa. |

### Landing (HomePage)

- **Hero**: Carrusel de imágenes (HeroCarousel).
- **Sobre nosotros**: Texto con nombre del negocio (SettingsContext).
- **Servicios**: Grid de servicios cargados desde `GET /api/services`; si falla o está vacío, se muestra lista estática por defecto.
- **Galería**: Carrusel 3D de imágenes (GalleryCarousel3D).
- **Testimonios**: Carrusel de testimonios desde `GET /api/testimonials` (activos); si falla o vacío, se usan testimonios por defecto.
- **Ubicación**: Placeholder “próximamente”.
- **CTA**: Enlaces a agendar cita (`/appointments`).
- Si el usuario es admin o barber, al final se muestran enlaces rápidos al panel (Dashboard, Citas, Clientes, Servicios, Barberos).

---

## Autenticación y roles

- **JWT**: Tras login o registro el backend devuelve un token. El frontend lo guarda en `localStorage` y lo envía en `Authorization: Bearer <token>`.
- **Roles**: `admin`, `barber`, `client`. El middleware `authorize` en backend y `ProtectedRoute` en frontend restringen por rol.
- **Perfil**: Tras login/register se llama a `GET /api/auth/me` (o equivalente en el backend dentro de la respuesta) para obtener perfil completo con `clientId` o `barberId` y así filtrar citas y permisos correctamente.

---

## API para Flutter

El backend expone una **API REST** pensada para ser consumida por una app móvil en **Flutter**. Puedes usar tanto los endpoints bajo `/api/mobile` (agrupados para el flujo móvil) como los endpoints estándar públicos o con autenticación.

### Base URL y cabeceras

- **Base URL**: `https://tu-dominio.com/api` (en desarrollo: `http://localhost:5000/api` o la IP de tu máquina si pruebas en dispositivo).
- **Cabeceras** en todas las peticiones:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` en rutas que requieren autenticación (obtener el token tras login).

### Autenticación (Flutter)

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| POST | `/api/mobile/auth/login` | No | `{ "email": "...", "password": "..." }` | `{ "success": true, "user": { ... }, "token": "..." }` |
| GET | `/api/mobile/auth/me` | Sí (Bearer) | — | `{ "success": true, "data": { "id", "email", "role", "firstName", "lastName", "clientId" \| "barberId", ... } }` |

Tras **login**, guarda el `token` y envíalo en `Authorization: Bearer <token>` en las siguientes peticiones. Con **GET /api/mobile/auth/me** puedes refrescar el perfil (incl. `clientId` para el rol cliente).

### Cliente: citas y disponibilidad

Para una app de **cliente** (rol `client`), usa estos endpoints (todos con `Authorization: Bearer <token>`):

| Método | Ruta | Query / Body | Descripción |
|--------|------|--------------|-------------|
| GET | `/api/mobile/client/availability` | `barberId`, `date` (YYYY-MM-DD) | Slots disponibles para ese barbero y fecha. |
| GET | `/api/mobile/client/appointments` | — | Lista de citas del cliente autenticado. |
| POST | `/api/mobile/client/appointments` | Body: `barberId`, `serviceId`, `appointmentDate` (ISO), `startTime?` (HH:MM), `notes?` | Crear una nueva cita (el `clientId` se toma del token). |

### Datos públicos (sin token)

Para pantallas de selección (barberos, servicios, configuración del negocio):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/barbers` | Lista de barberos (requiere token de cualquier rol: admin, barber o **client**). |
| GET | `/api/barbers/:id/schedules` | Horarios del barbero (mismo requisito de token). |
| GET | `/api/services` | Lista de servicios activos (**público**, no requiere token). |
| GET | `/api/settings/public` | Nombre del negocio y datos públicos (**público**). |
| GET | `/api/testimonials` | Testimonios activos para mostrar en la app (**público**). |

En Flutter puedes usar **GET /api/services** y **GET /api/settings/public** sin estar logueado; para barberos y horarios el backend exige un usuario autenticado (p. ej. cliente ya logueado).

### Resumen para Flutter

1. **Login**: `POST /api/mobile/auth/login` → guardar `token` y opcionalmente `user`.
2. **Perfil**: `GET /api/mobile/auth/me` con el token para obtener `clientId` y datos actualizados.
3. **Pantalla de reserva**:  
   - `GET /api/services` (público) para lista de servicios.  
   - `GET /api/barbers` con token para lista de barberos.  
   - `GET /api/mobile/client/availability?barberId=&date=` con token para slots.  
   - `POST /api/mobile/client/appointments` con token para crear la cita.
4. **Mis citas**: `GET /api/mobile/client/appointments` con token.
5. **Configuración / branding**: `GET /api/settings/public` sin token.

Las respuestas de error suelen ser `{ "success": false, "message": "..." }` con código HTTP 4xx; en 401 hay que borrar el token y redirigir a login.

---

## Configuración e instalación

### Requisitos
### Cliente: citas y disponibilidad

Para una app de **cliente** (rol `client`), usa estos endpoints (todos con `Authorization: Bearer <token>`):

| Método | Ruta | Query / Body | Descripción |
|--------|------|--------------|-------------|
| GET | `/api/mobile/client/availability` | `barberId`, `date` (YYYY-MM-DD) | Slots disponibles para ese barbero y fecha. |
| GET | `/api/mobile/client/appointments` | — | Lista de citas del cliente autenticado. |
| POST | `/api/mobile/client/appointments` | Body: `barberId`, `serviceId`, `appointmentDate` (ISO), `startTime?` (HH:MM), `notes?` | Crear una nueva cita (el `clientId` se toma del token). |

### Datos públicos (sin token)

Para pantallas de selección (barberos, servicios, configuración del negocio):

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/barbers` | Lista de barberos (requiere token de cualquier rol: admin, barber o **client**). |
| GET | `/api/barbers/:id/schedules` | Horarios del barbero (mismo requisito de token). |
| GET | `/api/services` | Lista de servicios activos (**público**, no requiere token). |
| GET | `/api/settings/public` | Nombre del negocio y datos públicos (**público**). |
| GET | `/api/testimonials` | Testimonios activos para mostrar en la app (**público**). |

En Flutter puedes usar **GET /api/services** y **GET /api/settings/public** sin estar logueado; para barberos y horarios el backend exige un usuario autenticado (p. ej. cliente ya logueado).

### Resumen para Flutter

1. **Login**: `POST /api/mobile/auth/login` → guardar `token` y opcionalmente `user`.
2. **Perfil**: `GET /api/mobile/auth/me` con el token para obtener `clientId` y datos actualizados.
3. **Pantalla de reserva**:  
   - `GET /api/services` (público) para lista de servicios.  
   - `GET /api/barbers` con token para lista de barberos.  
   - `GET /api/mobile/client/availability?barberId=&date=` con token para slots.  
   - `POST /api/mobile/client/appointments` con token para crear la cita.
4. **Mis citas**: `GET /api/mobile/client/appointments` con token.
5. **Configuración / branding**: `GET /api/settings/public` sin token.

Las respuestas de error suelen ser `{ "success": false, "message": "..." }` con código HTTP 4xx; en 401 hay que borrar el token y redirigir a login.

---

## Configuración e instalación

### Requisitos

- Node.js 18+
- PostgreSQL (por ejemplo [Neon](https://neon.tech) o instalación local)
- PostgreSQL (por ejemplo [Neon](https://neon.tech) o instalación local)

### Backend

1. `cd backend`
2. `npm install`
3. Crear `.env` en `backend/` con al menos:
   - `DATABASE_URL` – URL de conexión PostgreSQL (ej. `postgresql://user:pass@host:5432/dbname?sslmode=require`)
   - `JWT_SECRET` – secreto para firmar tokens (en producción usar valor seguro)
   - `PORT` – opcional, por defecto 5000
   - `FRONTEND_URL` – opcional, origen CORS (por defecto `http://localhost:5173`)
4. `npm run db:push` – sincroniza el schema con la BD
5. `npm run db:seed` – crea roles, usuarios de prueba, métodos de pago, configuración y servicios de ejemplo
2. `npm install`
3. Crear `.env` en `backend/` con al menos:
   - `DATABASE_URL` – URL de conexión PostgreSQL (ej. `postgresql://user:pass@host:5432/dbname?sslmode=require`)
   - `JWT_SECRET` – secreto para firmar tokens (en producción usar valor seguro)
   - `PORT` – opcional, por defecto 5000
   - `FRONTEND_URL` – opcional, origen CORS (por defecto `http://localhost:5173`)
4. `npm run db:push` – sincroniza el schema con la BD
5. `npm run db:seed` – crea roles, usuarios de prueba, métodos de pago, configuración y servicios de ejemplo

### Frontend

1. `cd frontend`
2. `npm install`
3. Opcional: crear `.env` o `.env.local` con `VITE_API_URL=http://localhost:5000/api` si no usas el proxy (en dev el proxy de Vite redirige `/api` a `http://localhost:5000`).
4. `npm run dev` – inicia el frontend en `http://localhost:5173`

Para uso normal en desarrollo, levantar backend (puerto 5000) y frontend (5173); el proxy de Vite enviará las peticiones `/api` al backend.

---
3. Opcional: crear `.env` o `.env.local` con `VITE_API_URL=http://localhost:5000/api` si no usas el proxy (en dev el proxy de Vite redirige `/api` a `http://localhost:5000`).
4. `npm run dev` – inicia el frontend en `http://localhost:5173`

Para uso normal en desarrollo, levantar backend (puerto 5000) y frontend (5173); el proxy de Vite enviará las peticiones `/api` al backend.

---

## Usuarios de prueba

Tras ejecutar `npm run db:seed` en `backend/`:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@mrkutz.com | password123 | Admin |
| barber@mrkutz.com | password123 | Barbero |
| client@mrkutz.com | password123 | Cliente |

---
Tras ejecutar `npm run db:seed` en `backend/`:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@mrkutz.com | password123 | Admin |
| barber@mrkutz.com | password123 | Barbero |
| client@mrkutz.com | password123 | Cliente |

---

## Comandos útiles
## Comandos útiles

**Backend**

- `npm run dev` – servidor con hot reload (--watch)
- `npm run start` – servidor producción
**Backend**

- `npm run dev` – servidor con hot reload (--watch)
- `npm run start` – servidor producción
- `npm run db:generate` – regenerar cliente Prisma
- `npm run db:push` – aplicar schema a la BD (sin migraciones)
- `npm run db:push` – aplicar schema a la BD (sin migraciones)
- `npm run db:seed` – ejecutar seed
- `npm run db:studio` – abrir Prisma Studio

**Frontend**

- `npm run dev` – desarrollo (puerto 5173, proxy a backend)
**Frontend**

- `npm run dev` – desarrollo (puerto 5173, proxy a backend)
- `npm run build` – build de producción
- `npm run preview` – previsualizar build

---

Este README describe el estado actual del proyecto: APIs, backend, frontend y base de datos, con nivel de detalle suficiente para desarrollar, mantener o desplegar Mr. Kutz.
- `npm run preview` – previsualizar build

---

Este README describe el estado actual del proyecto: APIs, backend, frontend y base de datos, con nivel de detalle suficiente para desarrollar, mantener o desplegar Mr. Kutz.
