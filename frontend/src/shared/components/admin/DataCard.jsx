/**
 * Card contenedor — diseño premium (landing-card)
 */

/**
 * @param {boolean} [overflowVisible=false] — Desactiva el recorte de la tarjeta.
 *   `overflow-hidden` convierte a la tarjeta en el scrollport más cercano y anula
 *   cualquier `position: sticky` de su contenido (p. ej. el panel de resumen del
 *   formulario de ventas embebido). Usar solo cuando haya contenido sticky dentro.
 */
export default function DataCard({ title, actions, children, className = '', compact, overflowVisible = false }) {
  const headerPad = compact ? 'px-4 py-2.5' : 'px-6 py-4';
  const titleCls = compact
    ? 'font-serif text-base font-medium text-stone-900 min-w-0 break-words'
    : 'font-serif text-lg font-medium text-stone-900 min-w-0 break-words';
  const bodyPad = compact ? 'p-3 sm:p-4' : 'p-6';
  return (
    <div
      className={`landing-card ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}${
        className ? ' ' + className : ''
      }`}
    >
      {(title || actions) && (
        <div
          className={`${headerPad} border-b border-stone-200/80 flex items-center justify-between gap-3 bg-stone-50/50 min-w-0`}
        >
          {title && <h3 className={titleCls}>{title}</h3>}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={bodyPad}>{children}</div>
    </div>
  );
}
