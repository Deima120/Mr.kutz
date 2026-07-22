/**
 * Adaptadores del contrato de CustomSelect.
 * CustomSelect invoca onChange(option.id) — nunca un evento nativo.
 */

/** Para handlers de formulario que esperan event.target.name/value. */
export function formSelectEvent(name, handler) {
  return (value) => handler({ target: { name, value: String(value ?? '') } });
}

/** Para setters de estado que guardan el id seleccionado como string. */
export function onCustomSelectValue(setter) {
  return (value) => setter(String(value ?? ''));
}
