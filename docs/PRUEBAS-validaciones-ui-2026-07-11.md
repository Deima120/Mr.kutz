# Captura de cambios y pruebas — 11 jul 2026

Documento de evidencia de los cambios de validación, UI de citas y módulo de pagos.

## 1. Problemas / errores que se corregían

| Problema | Antes | Después |
|----------|--------|---------|
| Documento exigía mínimo 10 dígitos con mensaje en pantalla | Mensaje “Mínimo 10 dígitos” | Rango 5–20; longitud sin mensaje escrito (`maxLength`) |
| Nombre/apellido aceptaban 1 letra o basura | Solo “obligatorio” | Solo letras; mín. 2 (sin mensaje de longitud); máx. 100 |
| Tipo de documento editable a mano (se podía cambiar “CC”) | Input + datalist libre | Select cerrado: CC, CE, TI, Pasaporte, NIT |
| Validaciones inconsistentes entre formularios | Cada pantalla distinta | Helpers compartidos FE + BE |
| Backend laxo (barberos, booking, auth teléfono) | Nombres/doc/teléfono permisivos | Alineado con reglas de cliente |
| Control Cancelar/Confirmar de citas solapado | Thumb tapaba textos | Deslizante: Cancelar ← Agendada → Confirmar |
| Pagos: buscador + “Nuevo registro de pago” | Ruido en UI | Eliminados |
| Volver del formulario de pago dentro de la tarjeta | Confuso | Volver **fuera** de la tarjeta |

## 2. Resumen de cambios por área

### Validaciones (producción)

- `frontend/src/shared/utils/authValidation.js` — reglas persona, documento, teléfono, notas
- `frontend/src/shared/utils/formValidation.js` — formularios unificados + límites de texto
- `backend/src/utils/validation.js` — helpers reutilizables (`personNameField`, `optionalPhoneField`, documento, notas)

**Reglas clave**

- Nombre / apellido: letras (incluye acentos), mín. 2 (silencioso), máx. 100  
- Tipo documento: enum fijo  
- Número documento: solo dígitos, 5–20 (longitud silenciosa en UI)  
- Teléfono opcional: 7–15 dígitos  
- Notas / descripciones: límites (500 / 1000 según campo)

**Formularios tocados:** registro público, cliente, barbero, horarios, booking, citas, servicios, productos, categorías, pagos, compras (notas BE), móvil (notas).

### UI citas

- `AppointmentActionToggles.jsx` — control deslizante con movimiento; etiquetas **Cancelar** / **Agendada** / **Confirmar**; tamaño restaurado

### UI pagos

- Sin buscador ni texto “Nuevo registro de pago”
- `AdminBackNav` fuera de `DataCard` al registrar pago

## 3. Checklist de prueba manual

### Registro (`/register`) y Cliente admin

- [ ] Tipo documento solo opciones del select  
- [ ] Documento: no mensaje de “mínimo X”; no deja enviar con &lt; 5 dígitos  
- [ ] Nombre “A” → no pasa; “Ana” → pasa (si solo letras)  
- [ ] Números en nombre → bloqueados o mensaje “solo letras”  
- [ ] Teléfono corto (&lt; 7) → error; vacío → OK  
- [ ] Email inválido / ya usado → feedback  

### Reserva pública (`/booking`)

- [ ] Mismas reglas de nombre/teléfono/notas (máx. 500)  

### Barberos

- [ ] Documento y nombres con mismas reglas  
- [ ] Horarios: inicio &lt; fin en días activos  

### Citas (listado admin)

- [ ] Deslizar a la izquierda → Cancelar (confirma diálogo)  
- [ ] Centro → Agendada  
- [ ] Derecha → Confirmar  
- [ ] Editar alineado al control  

### Pagos

- [ ] No aparece buscador ni “Nuevo registro de pago”  
- [ ] Al abrir “Registrar pago”, **Volver** está **fuera** de la tarjeta y cierra el formulario  

### Backend (smoke)

- [ ] POST registro con nombre de 1 letra → 400  
- [ ] POST cliente con documentType inventado → 400  
- [ ] POST booking con teléfono de 3 dígitos → 400  

## 4. Archivos principales (24)

Backend: `auth|client|barber|appointment|product|product-category|service|purchase|mobile.routes.js`, `utils/validation.js`  

Frontend: `authValidation.js`, `formValidation.js`, `RegisterPage`, `ClientFormPage`, `BarberFormPage`, `BarberSchedulesPage`, `BookingPage`, `AppointmentForm`, `AppointmentActionToggles`, `ServiceFormPage`, `ProductFormPage`, `ProductCategoriesPage`, `PaymentsPage`, `PaymentFormPage`

---

*Generado como evidencia de sesión de trabajo — 11 jul 2026.*
