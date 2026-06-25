/**
 * Badge/botón para activar o desactivar un servicio del catálogo.
 */

export function isServiceActive(service) {
  return (service?.is_active ?? service?.isActive) !== false;
}

export default function ServiceStatusToggle({ active, onClick, disabled = false, className = '' }) {
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
      title={active ? 'Clic para desactivar (no visible al agendar)' : 'Clic para activar'}
      className={`${base} ${active ? activeClass : inactiveClass} ${className}`.trim()}
    >
      {active ? 'Activo' : 'Inactivo'}
    </button>
  );
}
