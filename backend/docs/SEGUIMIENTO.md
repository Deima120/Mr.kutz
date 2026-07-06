# Seguimiento Mr. Kutz — Automatización y pendientes

Documento vivo para saber **qué ya está automatizado**, **qué sigue manual** y **qué conviene implementar después** (y cuándo).

Última revisión: junio 2026 · commit `eb1580e` en adelante.

---

## 1. Lo que ya está automatizado

### Citas — estados (hora Colombia, `America/Bogota`)

| Acción | Cómo funciona hoy |
|--------|-------------------|
| **Confirmar / Cancelar** | Manual en panel admin (toggle único). |
| **En progreso** | Automático cuando llega la **hora de inicio** (solo si la cita está `confirmed`). |
| **Completada** | Automático **10 min después** de la hora de fin (solo `confirmed` → `in_progress` → `completed`). |
| **Agendada sin confirmar** | **No avanza sola**; el admin debe confirmar. |

**Dónde corre la lógica**

- Backend: `appointmentStatusAutomation.js` + actualización al listar/obtener citas.
- **Cron en servidor:** cada **1 min** dentro del API (`appointmentStatusJob.js`) y cada **5 min** como Render Cron Job (`npm run cron:appointment-status`).
- Endpoint opcional: `POST /api/cron/appointment-status` con `Authorization: Bearer CRON_SECRET`.
- Frontend: estado “efectivo” en pantalla cada **10 s**; sincronización con API cada **30 s** (`AppointmentsPage`).

**Producción (Render):** configura `CRON_SECRET` y despliega el Cron Job de `render.yaml`. Así los estados se actualizan aunque nadie abra el panel y aunque el web service esté dormido (plan free).

### Correos (si SMTP/Brevo está configurado)

| Evento | Destinatario |
|--------|----------------|
| Cita creada | Cliente (confirmación) + barbero (aviso). |
| Cita pasa a **completada** | Cliente (invitación a valorar). |
| Olvidé contraseña | Usuario (código). |

Fire-and-forget: un fallo de correo no bloquea la operación.

### Panel admin (reciente)

- Listados con filtros **Activos / Todos / Inactivos** (servicios, barberos).
- Modales de eliminación con diseño Mr. Kutz (clientes, servicios).
- Export Excel de clientes.
- Sidebar: Dashboard suelto, sin enlace “Inicio”.

---

## 2. Lo que sigue siendo manual (hoy)

| Área | Qué hace falta hacer a mano |
|------|----------------------------|
| **Citas** | Confirmar cita agendada; cancelar si aplica; marcar **no asistió** (no hay regla automática). |
| **Pagos** | Registrar cobro en **Pagos**; el sistema lista citas completadas sin pago activo, pero no crea el pago solo. |
| **Inventario** | Revisar stock bajo; no hay alertas por correo ni push. |
| **Barberos / servicios inactivos** | Desactivar desde edición (checkbox / toggle); no se archivan solos. |
| **Clientes** | Seguimiento comercial (recontacto, “hace X días sin cita”) — **no existe módulo**. |
| **Recordatorios pre-cita** | No hay email/WhatsApp “mañana tienes cita”. |

---

## 3. Backlog — qué automatizar y cuándo

Prioridad sugerida para Mr. Kutz (barbería pequeña/mediana).

### Prioridad alta (impacto operativo diario)

| # | Tarea | Por qué | Cuándo automatizar |
|---|--------|---------|-------------------|
| A1 | ~~**Cron/jobs en backend**~~ ✅ Implementado | Estados sin panel abierto | Render Cron + timer en API |
| A2 | **Recordatorio 24 h / 2 h antes** de la cita (email) | Menos no-shows | Tras A1; reutilizar `mailer.js` + plantillas. |
| A3 | **Atajo “No asistió”** visible en admin el mismo día, post hora fin | Hoy el estado existe pero no hay flujo guiado | UI rápida (1 sprint); automatización opcional: marcar `no_show` si pasaron X h sin check-in manual. |

### Prioridad media (negocio y caja)

| # | Tarea | Por qué | Cuándo automatizar |
|---|--------|---------|-------------------|
| B1 | **Sugerencia de cobro** en dashboard (“N citas completadas sin pago”) con enlace a Pagos | Ya hay datos; falta visibilidad | Mejora UI; automatizar creación de pago solo si definen reglas (método por defecto, monto = servicio). |
| B2 | **Alerta stock bajo** (email admin o badge en Inventario) | `GET /products/low-stock` ya existe | Job diario + correo o notificación in-app. |
| B3 | **Auto-cancelar** citas `scheduled` no confirmadas X horas antes | Libera slots | Solo si el negocio lo confirma (política: p. ej. 2 h antes). |

### Prioridad baja / fase 2

| # | Tarea | Notas |
|---|--------|--------|
| C1 | **Seguimiento de clientes** (lista “sin cita en 30/60 días”) | Nuevo reporte o filtro en Clientes; no requiere cron al inicio. |
| C2 | **WhatsApp / SMS** recordatorios | Integración externa (Twilio, etc.). |
| C3 | **App móvil Flutter** empujes | Depende de API móvil ya documentada en README. |
| C4 | **Landing ubicación** | Sigue “próximamente” en HomePage. |

---

## 4. Reglas de negocio acordadas (no cambiar sin revisar)

1. Solo citas **confirmadas** entran en la automatización de inicio/fin.
2. Gracia de **10 minutos** después del fin antes de `completed`.
3. Zona horaria oficial del negocio: **Colombia (UTC-5)**.
4. Admin solo puede cambiar estado manualmente a: `scheduled`, `confirmed`, `cancelled` (vía confirmar/cancelar).

---

## 5. Checklist antes de automatizar más

- [ ] Push a producción (Vercel + Render) con Cron Job activo.
- [ ] Configurar `CRON_SECRET` en Render (web + cron job).
- [ ] Verificar correo en producción (`SMTP_*` / Brevo).
- [ ] Probar flujo real: agendar → confirmar → pasar hora → completada → correo valoración.
- [ ] Decidir política de **no asistió** y citas **sin confirmar**.
- [ ] Elegir herramienta de cron (Render Cron Job, GitHub Actions schedule, Uptime + endpoint, etc.).

---

## 6. Referencia rápida de archivos

| Tema | Archivos |
|------|----------|
| Automatización estados (API) | `backend/src/services/appointmentStatusAutomation.js`, `appointment.service.js` |
| Cron / job servidor | `backend/src/jobs/appointmentStatusJob.js`, `runAppointmentStatusSync.js`, `render.yaml` |
| Automatización (UI) | `frontend/src/features/appointments/utils/appointmentStatusAutomation.js`, `AppointmentsPage.jsx` |
| Hora Colombia | `backend/src/utils/colombiaTime.js`, `frontend/src/shared/utils/colombiaTime.js` |
| Correos citas | `backend/src/services/appointmentNotifications.js`, `backend/src/lib/mailer.js` |
| Pagos pendientes | `frontend/src/features/payments/pages/PaymentFormPage.jsx` |

---

*Actualizar este archivo cuando se implemente un ítem del backlog o cambien las reglas de citas.*
