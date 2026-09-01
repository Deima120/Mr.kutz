/**
 * Input de contraseña con botón para mostrar/ocultar («ojito»).
 *
 * El patrón (contenedor `relative`, `pr-11` para dejar sitio al icono y botón
 * absoluto a la derecha) estaba copiado a mano en LoginPage y RegisterPage, y
 * faltaba por completo en la pantalla de recuperar contraseña. Al extraerlo se
 * evita que cada copia derive por su lado, sobre todo en los detalles de
 * accesibilidad (`type="button"` para no enviar el formulario y `aria-label`
 * que cambia según el estado).
 *
 * Compone con `PublicFormField` en vez de competir con él: ese componente sigue
 * poniendo la etiqueta y el error, y este solo ocupa el hueco del `<input>`.
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  id,
  value,
  onChange,
  invalid = false,
  invalidClassName = '',
  errorId,
  /**
   * Clases base del input. Se deja configurable a propósito: la pantalla de
   * recuperación usa `input-premium` pelado y Login/Register añaden `rounded-lg`,
   * así que fijarlo aquí cambiaría el aspecto de una de las dos familias.
   */
  baseClassName = 'input-premium',
  className = '',
  disabled = false,
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseClassName} pr-11 ${invalid ? invalidClassName : ''} ${className}`.trim()}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Se deshabilita junto al input: en el paso de recuperación ambos campos
        // están bloqueados hasta verificar el código, y un ojito activo sobre un
        // campo inerte confunde.
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
