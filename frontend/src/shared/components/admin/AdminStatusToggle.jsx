/**
 * Badge/botón para activar o desactivar una entidad del panel admin.
 * Estilo semántico verde (activo) / gris (inactivo), distinto de las píldoras de filtro.
 *
 * Nació en `features/services/components/ServiceStatusToggle.jsx` y se promovió aquí al
 * necesitarse el mismo control en Barberos: el patrón de «Activo/Inactivo» debe verse y
 * comportarse igual en todo el panel. `ServiceStatusToggle` sigue existiendo como envoltorio
 * con el texto propio de Servicios, así que sus usos no cambiaron.
 */

export default function AdminStatusToggle({
  active,
  onClick,
  disabled = false,
  className = '',
  activeTitle = 'Clic para desactivar',
  inactiveTitle = 'Clic para activar',
}) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const activeClass =
    'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300';
  const inactiveClass =
    'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:border-stone-300';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={active ? activeTitle : inactiveTitle}
      className={`${base} ${active ? activeClass : inactiveClass} ${className}`.trim()}
    >
      {active ? 'Activo' : 'Inactivo'}
    </button>
  );
}
