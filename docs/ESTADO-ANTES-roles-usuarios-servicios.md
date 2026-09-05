# Estado del software ANTES del módulo de usuarios y roles

> **Qué es este documento.** Una fotografía de cómo funcionaban la autenticación, los roles, los
> usuarios y las categorías de servicio **antes** de añadir el módulo de usuarios y roles con
> permisos. Se escribió deliberadamente *antes* de tocar nada.
>
> **Para qué sirve.** Si algún cambio no convence y hay que volver atrás, o simplemente entender qué
> comportamiento había originalmente, este documento es el punto de referencia. Todo lo que aquí se
> describe corresponde al commit **`eebd4f9`**, que además está marcado con la etiqueta de git
> **`antes-roles-usuarios`** y empujado a `origin/fix/horarios-barbero-y-festivos`.
>
> Para recuperar el estado completo de ese momento: `git checkout antes-roles-usuarios`.

Fecha de la fotografía: 2026-09-04.

---

## 1. Cómo funcionaba la autenticación

### El token solo lleva el identificador

`backend/src/services/auth.service.js` firmaba el JWT con **únicamente** el `userId`:

```js
const generateToken = (userId) => {
  return jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRES,   // JWT_EXPIRES_IN o '7d' por defecto
    algorithm: JWT_ALGORITHM,
  });
};
```

**El rol no viajaba dentro del token.** Esto es la característica más importante del diseño y la
razón por la que añadir permisos resultó viable sin romper nada.

### El rol se consultaba en cada petición

`backend/src/middlewares/auth.js`, middleware `auth`:

1. Exige cabecera `Authorization: Bearer <token>`, si no responde **401**.
2. Verifica el token con `algorithms` explícito (defensa contra confusión de algoritmos).
3. Consulta la base: `prisma.user.findUnique({ where: { id: decoded.userId }, include: { role: true } })`.
4. Si el usuario no existe **o `isActive` es falso**, responde **401**.
5. Rellena `req.user` con `{ id, email, role_id, is_active, role_name }`.
6. Si el rol se llamaba literalmente `'barber'`, buscaba su fila `Barber` y añadía `barber_id`.
   Si se llamaba `'client'`, buscaba su fila `Client` y añadía `client_id`.

Consecuencias de este diseño, todas favorables:

- Cambiar el rol de alguien surtía efecto **en la petición siguiente**, sin renovar el token.
- Poner `isActive: false` **expulsaba al instante**. Era el único mecanismo de revocación: no había
  lista negra de tokens ni *refresh tokens*.
- Coste: una o dos consultas extra por petición.

### La autorización era comparación de texto

```js
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401)…;
  if (!allowedRoles.includes(req.user.role_name)) return res.status(403)…;
  next();
};
```

Sin jerarquía: `admin` no heredaba nada de `barber`, había que enumerarlo siempre.

---

## 2. Los roles que existían

Exactamente **tres**, y la lista canónica vivía **solo** en `backend/prisma/seed.js`:

| Rol | Descripción del seed |
|---|---|
| `admin` | Administrador del sistema con acceso total |
| `barber` | Barbero con acceso a citas y servicios |
| `client` | Cliente con acceso a reservar citas |

`Role` ya era una **tabla real** (`id`, `name @unique`, `description`, `createdAt`), no un enum. No
existía tabla de permisos ni nada más fino que el nombre del rol.

**No había constante compartida.** Los textos `'admin'`, `'barber'` y `'client'` estaban escritos a
mano en unos 35 sitios del backend y unos 20 del frontend.

---

## 3. Tabla completa de ruta → rol

Esta es la referencia para comprobar que el comportamiento no cambió. Cada permiso del catálogo nuevo
se derivó de esta tabla.

| Archivo de rutas | Protección |
|---|---|
| `appointment.routes.js` | Base `admin, barber, client`; `admin, barber` para una ruta; `client` para otra; `POST /` con `admin, client`; `PUT /:id` con `admin, client, barber` |
| `barber.routes.js` | `GET /`, `GET /:id`, `GET /:id/schedules` con `admin, barber, client`; `POST`, `PUT`, `PUT /:id/schedules`, `DELETE` solo `admin` |
| `service.routes.js` | Lectura **pública** (`GET /`, `GET /categories`, `GET /:id`); escritura con `admin, barber` |
| `client.routes.js` | Todo el router `admin` |
| `payment.routes.js` | Todo `admin` |
| `purchase.routes.js` | Todo `admin` |
| `supplier.routes.js` | Todo `admin` |
| `product.routes.js` | Todo `admin` |
| `product-category.routes.js` | Todo `admin` |
| `cashRegister.routes.js` | Todo `admin` |
| `commission.routes.js` | Todo `admin` |
| `expense.routes.js` | Todo `admin` |
| `otherIncome.routes.js` | Todo `admin` |
| `portfolio.routes.js` | Todo `admin` |
| `dashboard.routes.js` | Base `admin, barber`; `GET /report` solo `admin` |
| `mobile.routes.js` | `POST /auth/login` público; `GET/PUT /auth/me` cualquier rol autenticado; todo `/client/*` solo `client` |

**Dos rarezas del comportamiento original que conviene tener presentes**, porque se conservaron tal
cual al migrar a permisos:

1. **Un barbero podía crear, editar y borrar servicios** (`service.routes.js` protegía la escritura
   con `admin, barber`).
2. **Un cliente podía listar barberos y sus horarios** (lo necesita el asistente de reserva).

---

## 4. Cómo se creaban los usuarios

No existía ningún CRUD de usuarios: **no había `/api/users` ni `/api/roles`**, ni sus
routes/controller/service. Los usuarios nacían por tres caminos indirectos.

### Administrador — solo por terminal

`backend/scripts/create-admin.mjs`, ejecutado con `npm run create-admin`. Leía `ADMIN_EMAIL` y
`ADMIN_PASSWORD` del `.env`, exigía contraseña de 8 o más caracteres con mayúscula, minúscula y
dígito, y hacía un alta o actualización por correo canónico forzando `roleId` de admin e
`isActive: true`.

**No había ninguna vía HTTP para crear un administrador.** Esta es exactamente la carencia que
señalaron los profesores.

### Barbero — desde el panel

`POST /api/barbers` (solo `admin`). En `barber.service.js`, dentro de una transacción: crea el
`User`, luego el `Barber`, y luego sus horarios por defecto.

Limitación conocida: `update` **no permitía cambiar correo, contraseña ni rol**, y el `isActive` que
tocaba era el de `Barber`, **no el de `User`**. Consecuencia: **un barbero desactivado en el panel
seguía pudiendo iniciar sesión.**

### Cliente — dos formas

- **Registro público** (`POST /api/auth/register`): crea `User` + `Client`. El rol estaba forzado a
  `client` con doble candado — validación en la ruta y comprobación en el servicio que lanza 403 si
  se pide otro rol.
- **Alta desde el panel** (`POST /api/clients`, solo `admin`): creaba **solo la fila `Client`**, sin
  cuenta de acceso. El administrador no podía darle acceso web a un cliente.

`PATCH /api/clients/:id/status` sincronizaba en una transacción `Client.isActive` y, si el cliente
tenía cuenta, `User.isActive`. **Era el único punto del código que hacía esto bien**, y se conserva
intacto.

---

## 5. Identidad y modelo de datos

| Modelo | Relación con `User` |
|---|---|
| `Barber` | `userId` **obligatorio** y único, `onDelete: Cascade` |
| `Client` | `userId` **opcional** y único, `SetNull`. Los clientes de la reserva pública no tienen cuenta |

Tres banderas distintas que es fácil confundir:

- `User.isActive` — puede iniciar sesión.
- `Client.isActive` — puede agendar.
- `Barber.isActive` — está en activo en el equipo.

`User.roleId` era una llave foránea **obligatoria y sin `onDelete`**, es decir `Restrict`: no se podía
borrar un rol que tuviera usuarios. Además `User` estaba referenciado por unas 14 relaciones de
auditoría (pagos, movimientos de inventario, cajas, gastos, compras, proveedores, recepciones), lo que
hacía que **borrar un usuario fallara casi siempre**; lo correcto era desactivarlo.

---

## 6. El filtrado de datos por rol (el punto débil)

En `backend/src/controllers/appointment.controller.js` y en `dashboard.controller.js` el alcance de
lectura se decidía comparando el nombre del rol:

```js
if (role === 'barber')      { …solo sus citas… }
else if (role === 'client') { …solo sus citas… }
// else → veía TODO
```

Mientras solo existían tres roles esto funcionaba, porque el único que caía en el `else` era `admin`.
**Pero cualquier rol nuevo caería también en ese `else` y vería la agenda completa.** Por eso el
módulo de permisos tuvo que corregirlo antes de permitir crear roles.

Fuera de eso había una veintena larga de comprobaciones sueltas del tipo
`const isAdmin = user?.role === 'admin'` repartidas por controladores y componentes, que ocultaban
botones y columnas.

---

## 7. Frontend

- `AuthContext.jsx` guardaba `token` y `user` en `localStorage` y exponía
  `{ user, isAuthenticated, loading, login, logout, register, refreshUser, applyUser }`.
  **Detalle delicado:** ante un error que no parecía de autenticación (por ejemplo, red caída),
  restauraba el usuario cacheado del `localStorage`, con su rol. El rol del navegador podía quedar
  obsoleto, así que la decisión real siempre tenía que estar en el backend.
- `ProtectedRoute.jsx` comparaba directamente `allowedRoles.includes(user.role)`.
- `AdminLayout.jsx` decidía el menú con `const isAdmin = user?.role === 'admin'` y dos listas
  estáticas: `adminNavSections` (Operación y Negocio) y `barberNavSections`.
- `ProfilePage` existía pero estaba montada **solo para el rol `client`**, aunque el backend admitía
  también `barber`. Un administrador recibía **403** al intentar editar su perfil, porque no tiene
  fila de perfil asociada.

---

## 8. Categorías de servicio

El modelo `ServiceCategory` **ya existía y estaba completo** (`name @unique`, `description`,
`isActive`), y el seed sembraba siete: Cortes, Barba, Combos, Cejas, Depilación, Facial y Coloración.

Lo que faltaba era todo lo demás:

- **No había CRUD.** El único endpoint era `GET /api/services/categories`, de solo lectura, que
  devolvía `{ id, name }` de las activas y filtraba dos nombres heredados (`general` y `barbas`).
- **Las categorías solo nacían de forma implícita**: al crear o editar un servicio, el backend
  buscaba la categoría por nombre sin distinguir mayúsculas y, si no existía, la creaba.
- **En la interfaz no había ninguna forma de crear una.** El formulario de servicio usaba un
  desplegable cerrado, sin texto libre ni opción de añadir. La pantalla de Servicios solo tenía
  «Nuevo servicio»; no existía botón de Categorías, al contrario que Inventario, que sí tenía su
  pantalla en `/inventory/categories`.
- No había forma de **renombrar, desactivar ni borrar** una categoría.

`Service.categoryId` era opcional con `onDelete: SetNull`: borrar una categoría dejaría sus servicios
sin categoría, nunca los borraría.

---

## 9. Cómo volver a este estado

```bash
# Ver el código exactamente como estaba
git checkout antes-roles-usuarios

# Volver a la rama de trabajo
git checkout fix/horarios-barbero-y-festivos

# Deshacer solo una fase concreta (cada fase es un commit propio)
git revert <hash-de-la-fase>
```

Las migraciones de base de datos del módulo nuevo son **aditivas** (crean tablas y añaden columnas con
valor por defecto), así que revertir el código no deja la base en un estado inconsistente: las tablas
nuevas simplemente dejan de usarse.
