# Sistema de avisos (frontend)

Módulo: `frontend/src/shared/feedback/`. Sin librerías externas de toast/modales.

## Qué usar

| Caso | API |
|------|-----|
| Feedback breve tras acción (guardar, borrar, error de listado) | `useAppToast()` → `toast.success` / `error` / `warning` / `info` |
| Confirmación destructiva o irreversible | `AdminConfirmModal` (`danger` / `warning` / `neutral`) |
| Aviso persistente de contexto (stock bajo, hint de formulario) | `AppInlineAlert` |
| Error de validación en un campo o formulario | Inline en el form (`ADMIN_FORM_ERROR_CLASS`, `FieldErrorMessage`, etc.) |

## Reglas

1. **No** usar `window.alert`, `window.confirm` ni `window.prompt`.
2. **No** reintroducir `SuccessToast`; el toast global cubre ese rol.
3. Errores de **carga de listados/paneles** → `toast.error`, no banners rojos de página.
4. Errores de **formulario** → mensajes inline junto al formulario (el usuario sigue editando).
5. Cancelar cita (admin) → siempre `AdminConfirmModal` `danger`.
6. Archivar producto / anular (void) → `warning`.
7. Delete de entidad → `danger` vía `AdminConfirmModal`.

## Ejemplo rápido

```jsx
import { useAppToast } from '@/shared/feedback/ToastContext';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';

const toast = useAppToast();
toast.success('Guardado');
toast.error(err?.message || 'Error al cargar');

<AppInlineAlert variant="warning" title="Stock bajo">…</AppInlineAlert>

<AdminConfirmModal
  open={open}
  variant="danger"
  title="¿Eliminar?"
  onConfirm={handleDelete}
  onClose={() => setOpen(false)}
/>
```

`ToastProvider` ya envuelve la app en `frontend/src/index.js`.
