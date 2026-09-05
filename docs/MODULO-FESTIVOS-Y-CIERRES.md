# Módulo de festivos y cierres (retirado)

> **Estado: retirado del software.** Se implementó y funcionaba, pero se quitó
> porque no figura en la ficha ni en la documentación del proyecto y así lo
> recomendó la profesora. Este documento conserva el diseño completo para poder
> retomarlo sin volver a investigarlo.
>
> **Dónde está el código.** En el commit `eebd4f9`, accesible con la etiqueta
> `antes-roles-usuarios`:
>
> ```bash
> git show antes-roles-usuarios:backend/src/utils/colombianHolidays.js
> git show antes-roles-usuarios:backend/src/services/scheduleException.service.js
> git show antes-roles-usuarios:frontend/src/features/schedule-exceptions/pages/ScheduleExceptionsPage.jsx
> ```
>
> **Lo que sí se quedó** es la corrección de zona horaria de los horarios de
> barbero, que es independiente y es la que hace que las citas funcionen bien.

---

## 1. Qué resolvía

La barbería no atiende igual todos los días. El horario normal es de lunes a
sábado de 10:00 a 20:00 y los domingos de 11:00 a 18:00, pero hay días que se
salen de esa regla: los festivos colombianos, y los cierres puntuales que decide
el dueño (un inventario anual, un 24 de diciembre con horario corto, un puente
que se decide trabajar).

Sin el módulo, la agenda ofrecía turnos en días en los que la barbería no abría.

## 2. Decisión de diseño principal: los festivos se calculan, no se guardan

Colombia tiene **18 festivos al año** y todos son deducibles con dos reglas, así
que no hacía falta ni una tabla que alguien rellenara cada enero ni una API
externa de la que depender:

- **Ley 51 de 1983, «Ley Emiliani»**: siete festivos se trasladan al lunes
  siguiente cuando no caen en lunes. Otros seis son de fecha inamovible.
- **Pascua**: seis se derivan del Domingo de Resurrección, calculado con el
  algoritmo de Meeus/Butcher, que es aritmética pura y da el mismo resultado en
  cualquier máquina. Jueves y Viernes Santo **no** se trasladan; Ascensión,
  Corpus Christi y Sagrado Corazón sí, pero su desplazamiento ya va incorporado
  en el número de días que se suma, así que caen siempre en lunes.

Los festivos fijos eran Año Nuevo, Día del Trabajo, Independencia, Batalla de
Boyacá, Inmaculada Concepción y Navidad. Los de Ley Emiliani: Reyes Magos, San
José, San Pedro y San Pablo, Asunción, Día de la Raza, Todos los Santos e
Independencia de Cartagena.

**Detalle crítico:** toda la aritmética usaba `Date.UTC` y se leía con `getUTC*`.
Con fechas locales el resultado dependería de dónde corriera el proceso (Render
va en UTC y el desarrollo local en UTC-5), que es justo el tipo de error que el
módulo venía a evitar.

## 3. Lo que sí se guardaba: la tabla de excepciones

Una sola tabla, sin relaciones con ninguna otra:

```sql
CREATE TABLE "schedule_exceptions" (
  "id"         SERIAL       NOT NULL,
  "date"       DATE         NOT NULL,   -- única: una excepción por fecha
  "is_closed"  BOOLEAN      NOT NULL DEFAULT false,
  "start_time" TIME(6),
  "end_time"   TIME(6),
  "reason"     VARCHAR(200),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "schedule_exceptions_date_key" ON "schedule_exceptions" ("date");
```

Cubría solo lo que ningún calendario puede saber. La fecha era única porque desde
el panel «marcar este día» es la misma acción exista o no, lo que hacía natural
un `upsert` y permitía resolver un día con una sola consulta.

Los tres estados posibles se expresaban con combinaciones de esos campos:

| Intención | `is_closed` | horas |
|---|---|---|
| Cerrado ese día | `true` | se ignoran |
| Horario especial | `false` | ambas presentes |
| **Trabajar un festivo con normalidad** | `false` | **ambas vacías** |

El tercero es el menos evidente: «día normal» se expresaba con la **ausencia** de
horas, no con un valor propio.

## 4. La regla de precedencia

De mayor a menor:

1. **Excepción manual del administrador.** Manda siempre: cierra el día, impone
   un horario especial, o anula el festivo.
2. **Festivo colombiano.** Cambia la ventana del negocio a la de festivo,
   **11:00 a 18:00 caiga el día que caiga**. Ésta era la respuesta a «un festivo
   cae en lunes, ¿qué pasa?»: se atiende 11:00-18:00 en vez de 10:00-20:00.
3. **Horario del barbero.** Se aplica siempre encima: un festivo cambia el
   horario, pero **no abre** un día que el barbero tiene marcado como no
   disponible.

En un día normal mandaba el horario del barbero **sin recortarlo** con el del
negocio, para que un barbero que abriera antes o cerrara más tarde no se viera
encogido en silencio. En festivo o excepción con horario, la franja final era la
**intersección** de ambas ventanas; si no se solapaban, el día quedaba cerrado.

## 5. Estructura del código

| Archivo | Papel |
|---|---|
| `backend/src/utils/colombianHolidays.js` | Cálculo puro. `easterSunday`, `getColombianHolidays(year)` con caché por año, `isColombianHoliday(fecha)` |
| `backend/src/services/barberScheduleRules.js` | `resolveDayWindow` (con barbero) y `resolveShopDayWindow` (solo negocio), más `intersectWindows` y `SHOP_HOURS.holiday` |
| `backend/src/services/scheduleException.service.js` | `getForDate`, `list`, `getCalendar`, `upsert`, `remove` |
| `backend/src/controllers/scheduleException.controller.js` | Capa HTTP |
| `backend/src/routes/scheduleException.routes.js` | Rutas y validación |
| `frontend/src/features/schedule-exceptions/` | Pantalla y su cliente de API |

Punto de enganche con la agenda: `resolveBarberDayWindow` en
`appointment.service.js`, que combinaba el horario del barbero, el festivo
calculado y la excepción del día. De ahí bebían tanto el cálculo de turnos
disponibles como la validación al crear o editar una cita, de modo que no
pudieran discrepar.

## 6. Contrato de la API

| Método | Ruta | Rol | Qué hacía |
|---|---|---|---|
| `GET` | `/api/schedule-exceptions/calendar?year=` | admin, barber, client | Festivos calculados fusionados con las excepciones cargadas |
| `GET` | `/api/schedule-exceptions?from=&to=` | admin, barber, client | Solo las excepciones, por rango |
| `POST` | `/api/schedule-exceptions` | admin | `upsert` por fecha. 201 |
| `DELETE` | `/api/schedule-exceptions/:id` | admin | 404 si no existe |

La lectura estaba abierta a barberos y clientes porque la agenda y el asistente
de reserva necesitan saber qué días están cerrados.

`GET /calendar` devolvía además, por cada día, **el horario con el que quedaba
realmente el negocio**: `day_of_week`, `effective_closed`, `effective_start`,
`effective_end` y `effective_reason`. Se resolvía en el backend a propósito, para
que la pantalla no tuviera que duplicar la regla de precedencia y no pudiera
contradecir a la agenda.

## 7. La pantalla

Ruta `/schedule-exceptions`, solo administrador. Mostraba el año resuelto —los 18
festivos calculados más los cierres cargados a mano— con una columna «Horario del
negocio» que enseñaba cómo quedaba cada día, con la nota *(horario de festivo)*
cuando aplicaba.

El formulario tenía los tres modos excluyentes de la tabla del punto 3, con texto
de ayuda bajo el formulario porque el modo «día normal» no es evidente. Borrar no
borraba el día: quitaba el ajuste y el día volvía a su cálculo automático.

Un detalle a no perder si se retoma: la fecha **no se pasaba por `new Date`** para
mostrarla, porque eso la interpreta en la zona del navegador y puede pintar el día
anterior.

## 8. Si se quiere retomar

1. Recuperar los archivos del punto 5 desde la etiqueta `antes-roles-usuarios`.
2. Volver a crear la tabla: la migración `20260904120000_schedule_exceptions`
   sigue en el historial, pero fue anulada por una posterior que hace `DROP
   TABLE`. Hay que crear una migración nueva con el SQL del punto 3.
3. Reponer en `barberScheduleRules.js` la clave `holiday` de `SHOP_HOURS`, el
   parámetro `isHoliday` de `shopWindowFor`, `intersectWindows` y las ramas de
   festivo y excepción de `resolveDayWindow`.
4. Volver a enganchar `resolveBarberDayWindow` en `appointment.service.js`.
5. Registrar la ruta, la pantalla y la entrada de menú.
6. **Ojo con los permisos**: el software ahora tiene permisos configurables, así
   que habría que añadir al catálogo de `src/config/permissions.js` algo como
   `schedule_exceptions.view` y `schedule_exceptions.manage`, y dárselos a los
   roles que corresponda, en lugar de proteger las rutas por nombre de rol.
7. Los tests estaban en `colombianHolidays.test.js` y en los bloques de festivos,
   excepciones y `resolveShopDayWindow` de `barberScheduleRules.test.js`.
   Recordar añadirlos a mano al script `test` de `backend/package.json`.
