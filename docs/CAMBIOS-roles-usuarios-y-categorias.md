# Cambios: usuarios y roles, retirada de festivos, categorías de servicio

> Documento de referencia de los tres cambios pedidos tras la revisión de los
> profesores. Para saber **cómo era el software antes**, ver
> [ESTADO-ANTES-roles-usuarios-servicios.md](./ESTADO-ANTES-roles-usuarios-servicios.md).
> Para el módulo retirado, ver
> [MODULO-FESTIVOS-Y-CIERRES.md](./MODULO-FESTIVOS-Y-CIERRES.md).

## Índice de commits

| Commit | Qué hace |
|---|---|
| `antes-roles-usuarios` (etiqueta) | Estado previo, punto de retorno |
| `01c3f57` | Base de permisos y cierre de la escalada por rol nuevo |
| `6d825f0` | API de usuarios y roles con salvaguardas |
| `7be5c6d` | Pantallas de Usuarios y Roles |
| `f8353ba` | Retirada del módulo de festivos |
| `6693788` | Categorías de servicio |

Cada fase es un commit propio, así que se puede deshacer una sin arrastrar las
demás con `git revert <hash>`.

---

## 1. Usuarios y roles con permisos

### Por qué

Un administrador solo se podía crear ejecutando `npm run create-admin` desde la
terminal, y no había forma de dar acceso acotado a alguien —el contador, un
familiar del dueño— sin convertirlo en administrador con acceso total. Los
profesores lo señalaron como requisito de escalabilidad.

### Decisiones tomadas

**Los clientes quedan fuera del módulo.** Un cliente es un cliente y no cambia de
rol. Si se pudiera promover desde la pantalla de usuarios, alguien que se
registró solo para reservar una cita podría acabar con acceso al dinero del
negocio. Su gestión sigue exactamente donde estaba, en el módulo de Clientes, que
además ya sincronizaba bien la ficha con el acceso. La exclusión se aplica en el
servidor por partida doble: la lista los filtra, y cambiar el rol o el estado de
alguien con ficha de cliente se rechaza con **409** aunque se llame a la API a
mano.

**Los permisos son configurables, pero el catálogo no.** Los permisos se declaran
en `backend/src/config/permissions.js` y el seed los vuelca a la base. No se
crean desde el panel porque un permiso que ningún código consulte no haría nada.
Lo que sí se configura es qué permisos tiene cada rol.

**El comportamiento anterior no cambia.** Los tres roles existentes reciben en el
seed exactamente los accesos que ya tenían. Se conservan a propósito dos rarezas
heredadas, ahora anotadas: el barbero puede gestionar servicios, y el cliente
puede listar barberos y horarios porque lo necesita el asistente de reserva.

### El agujero que había que cerrar antes de nada

En las citas y en el panel, el alcance de lectura se decidía así:

```js
if (rol === 'barber')      { …solo lo suyo… }
else if (rol === 'client') { …solo lo suyo… }
// else → veía TODO
```

Mientras solo existían tres roles, el único que caía en el caso final era el
administrador. **Pero cualquier rol nuevo habría caído ahí también**, viendo la
agenda completa y los ingresos del negocio sin que nadie se lo concediera. Era
una escalada de privilegios silenciosa, y por eso se corrigió *antes* de que
existiera la pantalla que permite crear roles.

La corrección separa **identidad** de **rol**: el middleware ya no deduce el
perfil por cómo se llame el rol, sino por la existencia de la ficha de barbero o
de cliente; y el alcance se decide por permiso explícito, **fallando cerrado**
(quien no puede verlo todo y tampoco tiene ficha propia no ve nada).

### Salvaguardas

| Riesgo | Qué lo impide |
|---|---|
| Quedarse sin nadie que pueda entrar | No se puede desactivar, borrar ni bajar de rol al último usuario activo capaz de gestionar usuarios. Se cuenta **por permiso**, no por el nombre del rol |
| Autobloquearse | Nadie puede cambiarse su propio rol ni desactivarse |
| Auto-promoverse | Quien gestiona roles no puede conceder un permiso que él mismo no tenga |
| Perder el acceso de rescate | Los permisos del rol `admin` no se editan |
| Romper el código que asume los roles | Los roles de sistema no se borran ni se renombran |
| Perder trazabilidad | Borrar un usuario con movimientos registrados se rechaza; la baja normal es desactivar |

### Cómo se crea el rol «Contador»

1. **Sistema → Roles → Nuevo rol**. Nombre: `Contador`.
2. Marcar solo consultas: `payments.view`, `purchases.view`, `expenses.view`,
   `commissions.view`, `dashboard.view.all`. **Ninguna casilla de gestión.**
3. **Sistema → Usuarios → Nuevo usuario**, con ese rol y una contraseña temporal.

Resultado: entra, ve los números, y no puede modificar nada ni acceder a
clientes.

### Móvil

El contrato **no cambia**: `/api/mobile/client/*` sigue exigiendo el rol
`client`. Lo único nuevo es que `GET /auth/me` devuelve ahora también `role` y
`permissions`, para que la app pueda ocultar opciones. Ver
`backend/docs/API_MOBILE.md`.

---

## 2. Retirada del módulo de festivos

Se quitó porque no figuraba en la ficha ni en la documentación del proyecto, y
así lo recomendó la profesora. **No es un problema técnico**: funcionaba.

Se conserva íntegra la corrección de zona horaria de los horarios de barbero, que
es independiente y es la que hace que las citas funcionen bien. Como ambas cosas
viajaban en el mismo commit, hubo que extraer solo la parte de festivos en vez de
revertir.

La tabla `schedule_exceptions` se borró con una migración propia: estaba vacía y
no tenía ninguna llave foránea, así que la operación no podía dejar registros
huérfanos. La migración original que la creaba se conserva en el historial
porque ya figura como aplicada, y borrar su carpeta rompería
`prisma migrate status`.

---

## 3. Categorías de servicio

Antes no se podían gestionar desde ninguna parte: solo se elegían de un
desplegable cerrado, y nacían de rebote cuando el alta de un servicio mencionaba
un nombre inexistente —cosa que el propio desplegable no permitía—.

Se replica el patrón que ya funcionaba en Inventario. Dos detalles:

- El CRUD va bajo su propio prefijo `/service-categories`, no colgando de
  `/services`, donde ya conviven `GET /services/:id` y `GET /services/categories`
  y solo funciona por el orden de declaración.
- La comprobación de nombre repetido **no distingue mayúsculas**: el índice único
  de la base sí las distingue, así que sin eso «Combos» y «combos» convivirían.

Borrar una categoría **no borra sus servicios**: se quedan sin categoría. El
modal avisa de cuántos.

---

## Cómo revertir

```bash
# Volver al estado previo completo
git checkout antes-roles-usuarios

# Deshacer una fase concreta
git revert 6693788   # categorías de servicio
git revert f8353ba   # devuelve el módulo de festivos
git revert 7be5c6d   # quita las pantallas de usuarios y roles
git revert 6d825f0   # quita la API
git revert 01c3f57   # quita la base de permisos
```

Las fases de permisos hay que revertirlas **en orden inverso**, porque la API
depende del middleware y las pantallas de la API.

Sobre la base de datos: las migraciones de permisos son **aditivas** (crean dos
tablas y añaden tres columnas con valor por defecto), así que revertir el código
no deja la base inconsistente: las tablas nuevas simplemente dejan de usarse. La
de festivos sí es destructiva —borra una tabla que estaba vacía—, y para
recuperarla habría que crear una migración nueva con el SQL que quedó
documentado.

---

## Estado de verificación

| Comprobación | Resultado |
|---|---|
| `backend/npm test` | **259/259** |
| `frontend/npm test` | 92/93 — el único fallo es el **preexistente** de `productFormatters.test.js` (alias `@/`, que solo resuelve Vite) |
| `frontend/npm run build` | Correcto |
| `npx prisma validate` | Correcto |
| Lint / typecheck | **No existen en este repositorio**: no se pueden ejecutar y no se dan por pasados |
| Migraciones aplicadas | **Todavía no.** Pendiente de decidir contra qué base se prueba |
| Pruebas manuales en navegador | **Pendientes** |
