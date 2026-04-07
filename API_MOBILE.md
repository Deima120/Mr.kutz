## API Móvil - MR KUTZ

### 1. Información general

- **Base URL desarrollo**: `http://localhost:5000/api/mobile`
- **Autenticación**:
  - Header obligatorio en rutas protegidas: `Authorization: Bearer <token>`
  - Roles soportados: `client`, `barber`, `admin`

Todas las respuestas siguen el formato:

```json
{
  "success": true,
  "message": "Mensaje opcional",
  "data": { }
}
```

---

### 2. Autenticación

#### 2.1 Login

- **Método**: `POST`
- **Endpoint**: `/auth/login`
- **Body (JSON)**:

```json
{
  "email": "cliente@ejemplo.com",
  "password": "123456"
}
```

- **Respuesta 200**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 1,
      "email": "cliente@ejemplo.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "client"
    }
  }
}
```

> El `token` debe guardarse en almacenamiento seguro y enviarse en el header `Authorization` en las siguientes peticiones.

#### 2.2 Perfil del usuario autenticado

- **Método**: `GET`
- **Endpoint**: `/auth/me`
- **Headers**:
  - `Authorization: Bearer <token>`

- **Respuesta 200**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "cliente@ejemplo.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "client",
    "phone": "555-1234"
  }
}
```

---

### 3. Cliente móvil (rol `client`)

> Todas estas rutas requieren header `Authorization: Bearer <token>` de un usuario con rol `client`.

#### 3.1 Disponibilidad de horarios por barbero

- **Método**: `GET`
- **Endpoint**: `/client/availability`
- **Query params**:
  - `barberId` (number, requerido)
  - `date` (string, formato `YYYY-MM-DD`, requerido)

- **Ejemplo**:
  - `GET /client/availability?barberId=1&date=2026-03-20`

- **Respuesta 200 (ejemplo)**:

```json
{
  "success": true,
  "data": [
    { "time": "10:00", "isAvailable": true },
    { "time": "10:30", "isAvailable": false }
  ]
}
```

> El contenido exacto de `data` puede variar según la lógica de negocio, pero la app debe considerar que es una lista de slots con su disponibilidad.

#### 3.2 Listar citas del cliente (próximas + historial)

- **Método**: `GET`
- **Endpoint**: `/client/appointments`
- **Query params opcionales**:
  - `date` (filtrar por fecha exacta)
  - `dateFrom`, `dateTo` (rango de fechas)
  - `status` (`scheduled`, `confirmed`, `completed`, `cancelled`, etc.)
  - `limit`, `offset` (paginación, por defecto `limit=100`)

- **Ejemplo**:
  - `GET /client/appointments?dateFrom=2026-03-01&dateTo=2026-03-31&status=completed`

- **Respuesta 200 (ejemplo simplificado)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "appointment_date": "2026-03-20T00:00:00.000Z",
      "start_time": "1970-01-01T10:00:00.000Z",
      "status": "completed",
      "client_first_name": "María",
      "client_last_name": "García",
      "barber_first_name": "Carlos",
      "barber_last_name": "López",
      "service_name": "Corte + Barba",
      "clientRating": 5,
      "clientRatingComment": "Excelente servicio",
      "clientRatedAt": "2026-04-07T15:30:00.000Z"
    }
  ]
}
```

> La lista real usa campos planos (`appointment_date`, `service_name`, nombres de barbero/cliente, etc.) y **camelCase** para la valoración: `clientRating` (1–5 o `null`), `clientRatingComment`, `clientRatedAt`.

#### 3.3 Crear una cita

- **Método**: `POST`
- **Endpoint**: `/client/appointments`
- **Body (JSON)**:

```json
{
  "barberId": 1,
  "serviceId": 3,
  "appointmentDate": "2026-03-20",
  "startTime": "10:00",
  "notes": "Corte antes de evento"
}
```

> El `clientId` NO se envía; se toma internamente del token JWT del usuario autenticado.

- **Respuesta 201**:

```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "id": 11,
    "barberId": 1,
    "clientId": 5,
    "serviceId": 3,
    "appointmentDate": "2026-03-20",
    "startTime": "10:00",
    "status": "scheduled"
  }
}
```

#### 3.4 Valorar una cita completada

- **Método**: `POST`
- **Endpoint**: `/client/appointments/:id/rating`
- **Body (JSON)**:

```json
{
  "rating": 5,
  "comment": "Opcional: comentario (máx. 2000 caracteres)"
}
```

- **Reglas**: la cita debe existir, pertenecer al cliente del token, estar en `completed` y no haber sido valorada antes. `rating` es entero de 1 a 5.

- **Respuesta 200**: `success`, `data` con el detalle de la cita (incluye `clientRating`, `clientRatingComment`, `clientRatedAt`).

> Equivalente: `POST /api/appointments/:id/rating` con el mismo body y token de **client**.

#### 3.5 Resumen agregado (app barbero / admin)

Usar la API principal (no el prefijo `/mobile`), con JWT de rol **barber** u **admin**:

- **GET** `http://localhost:5000/api/appointments/rating-summary`
- **Query**: `days` = `30`, `7`, etc., o `all` sin filtro de fechas; `barberId` solo para **admin** (el barbero solo ve sus datos).

**Ejemplo de `data`:**

```json
{
  "average": 4.67,
  "count": 12,
  "distribution": { "1": 0, "2": 0, "3": 1, "4": 4, "5": 7 },
  "recent": [
    {
      "appointmentId": 42,
      "clientName": "María García",
      "rating": 5,
      "comment": "Muy bien",
      "date": "2026-04-07T12:00:00.000Z",
      "serviceName": "Corte + barba",
      "barberName": "Carlos López"
    }
  ]
}
```

---

### 4. Notas para el equipo móvil

- **Base URL desarrollo**: `http://localhost:5000/api/mobile`
- **Base URL producción**: se definirá más adelante (ejemplo: `https://api.mrkutz.com/api/mobile`).
- Siempre enviar el header:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

- El flujo típico en la app:
  1. Hacer `POST /auth/login` con email y password.
  2. Guardar `data.token` en almacenamiento seguro.
  3. Usar ese token en todas las llamadas protegidas.
  4. Consumir `/client/availability`, `/client/appointments`, `POST /client/appointments` y, tras citas completadas, `POST /client/appointments/:id/rating` si aplica.
  5. La app **barbero** puede consumir `GET /api/appointments/rating-summary` en la base `http://localhost:5000/api` con el token del barbero.

