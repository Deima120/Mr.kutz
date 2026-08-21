# Cambios — Permisos del rol barbero (21 ago 2026)

Trabajo en la rama **`feacture/sesion`**, motivado por tres fallos reportados desde la app
móvil (`mobile_kutz`). Al investigarlos se comprobó que dos de ellos no eran bugs de la app
sino **restricciones del backend**: el rol `barber` no tenía ninguna operación de escritura
en todo el sistema.

> ⚠️ **Estos cambios afectan a toda la API, no solo al móvil.** El software web comparte el
> mismo backend. Ver [Impacto en el software web](#3-impacto-en-el-software-web).

> ⚠️ **Orden de despliegue: este repo primero, la app después.** Al revés, el barbero
> recibirá 403 en la app.

## 1. Problemas corregidos

| Problema | Antes | Después |
| --- | --- | --- |
| El barbero no podía confirmar ni cancelar citas | `PUT /appointments/:id` no lo incluía en `authorize`, y el controlador lo rechazaba de plano | Puede confirmar y cancelar **solo sus propias citas** |
| Las citas creadas desde el móvil se quedaban congeladas | La automatización solo promueve citas `confirmed`, y solo un admin podía confirmar | El barbero confirma y arranca el ciclo automático |
| El barbero no podía editar su propio perfil | `updateProfile` rechazaba a todo el que no fuera cliente, y no existía ninguna otra vía | Puede editar nombre, apellido, teléfono y correo |

## 2. Cambios por área

### Permisos sobre citas

**Nuevo `src/services/appointmentBarberRules.js`** — función pura al estilo de
`appointmentCancelRules.js`, con su test propio:

- `canBarberUpdate(existing, barberId, body)`: la cita debe ser suya, no estar en un estado
  terminal (`cancelled`, `no_show`, `completed`) y el `status` pedido debe ser `confirmed`
  o `cancelled`. Una petición **sin** `status` también se rechaza, porque el resto de campos
  le están vetados y no tendría ningún efecto.
- `stripBarberForbiddenFields(body)`: elimina `clientId`, `barberId`, `serviceId`,
  `serviceIds`, `appointmentDate` y `startTime`. El barbero no reprograma ni cambia servicios.

**`src/routes/appointment.routes.js`** — `PUT /:id` pasa de `authorize('admin', 'client')`
a `authorize('admin', 'client', 'barber')`. El alcance real lo impone el controlador.

**`src/controllers/appointment.controller.js`** — se sustituye el rechazo incondicional del
principio de `update` por una rama `barber` que consulta `canBarberUpdate` y limpia el body.

**`backend/package.json`** — se añade el test nuevo al script `test`, que lista los archivos
explícitamente.

### Autoedición de perfil

**`src/services/auth.service.js`** — `updateProfile` incluye `barber` en el `include` y
bifurca por rol en lugar de rechazar:

- `client`: sin cambios. Actualiza `User.email` y `Client.firstName/lastName/phone/email`.
- `barber`: actualiza `User.email` y `Barber.firstName/lastName/phone`. **`Barber` no tiene
  columna de correo**: el suyo vive solo en `User`.
- Otro rol o sin fila de perfil vinculada: sigue siendo 403.

`getProfile` no se tocó: ya devolvía `barberId`, `phone` y `specialties` para barberos.

## 3. Impacto en el software web

El `authorize` ampliado y la rama nueva del controlador aplican a **cualquier consumidor de
la API**, incluido el frontend web.

**Qué NO cambia:**
- **Admin**: mismos permisos que antes, sin restricciones nuevas.
- **Cliente**: misma lógica; sigue pudiendo solo cancelar sus citas, con `cancelReason`
  obligatorio y la ventana de 30 minutos.
- **Automatización**: `in_progress` y `completed` siguen siendo exclusivos del cron. Ningún
  rol puede fijarlos manualmente (`MANUAL_ADMIN_STATUSES` no se tocó).
- **Rutas de admin**: `PUT /clients/:id` y `PUT /barbers/:id` siguen siendo admin-only. Un
  barbero **no** puede cambiar su documento, sus especialidades ni su comisión.

**Qué sí cambia:** si el frontend web tiene una vista de barbero, ahora podría ofrecerle
confirmar y cancelar sus citas. Es una capacidad nueva; no rompe nada existente.

## 4. Cómo revertir

Los dos commits son independientes:

| Commit | Qué revierte | Efecto en el móvil |
| --- | --- | --- |
| `feat(appointments): el barbero puede confirmar y cancelar sus citas` | Permisos sobre citas | El deslizante de la agenda devolverá 403 |
| `feat(auth): el barbero puede editar su propio perfil` | Autoedición de perfil | Guardar el perfil devolverá 403 **solo para barberos**; el cliente seguirá funcionando |

En ambos casos la app degrada mostrando el mensaje de error, no se rompe.

Revertir el segundo commit **no** afecta al cliente: su rama de `updateProfile` quedó
intacta y la app móvil ya usaba `PUT /mobile/auth/me` para ese rol.

## 5. Checklist de pruebas

- [x] `npm test` — 176 tests en verde (20 nuevos de `appointmentBarberRules`)
- [ ] Barbero confirma una cita suya → 200, queda `confirmed`
- [ ] Barbero intenta confirmar la cita de otro → 403 "Solo puedes modificar tus propias citas."
- [ ] Barbero intenta poner `in_progress` → 403 "Como barbero solo puedes confirmar o cancelar la cita."
- [ ] Barbero cancela sin `cancelReason` → 400
- [ ] Barbero intenta cambiar la fecha junto con el estado → se ignora el cambio de fecha
- [ ] Barbero edita su perfil vía `PUT /api/mobile/auth/me` → 200
- [ ] Cliente edita su perfil → sigue funcionando igual
- [ ] Admin conserva todos sus permisos sobre citas
- [ ] Cita confirmada pasa sola a `in_progress` y luego a `completed`

## 6. Archivos principales

**Nuevos:** `src/services/appointmentBarberRules.js`,
`src/services/appointmentBarberRules.test.js`

**Modificados:** `src/controllers/appointment.controller.js`,
`src/routes/appointment.routes.js`, `src/services/auth.service.js`, `package.json`

---

*Generado como evidencia de sesión de trabajo — 21 ago 2026. Documento hermano en
`mobile_kutz/docs/CAMBIOS-perfil-y-acciones-barbero-2026-08-21.md`.*
