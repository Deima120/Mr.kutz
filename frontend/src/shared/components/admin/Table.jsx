/**
 * Tabla administrativa — diseño premium (stone, gold accents).
 *
 * Define la escala tipográfica que comparten TODOS los listados del panel.
 * Si un módulo necesita otro tamaño, se corrige aquí y no con clases sueltas
 * en la página: lo contrario es lo que había hecho que cada listado acabara
 * con su propio tamaño de letra.
 */

export default function Table({ children, scroll = true, className = '' }) {
  return (
    <div
      className={`${scroll ? 'overflow-x-auto' : 'overflow-x-hidden'} rounded-xl border border-stone-200/80`}
    >
      <table className={`w-full text-sm ${className}`.trim()}>{children}</table>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead>
      <tr className="border-b border-stone-200 bg-stone-50">
        {children}
      </tr>
    </thead>
  );
}

export function TableHeader({ children, className = '', compact }) {
  // Encabezado estándar: 12px en versalitas. Antes el modo compacto bajaba a
  // 11px, que en pantalla se leía como ruido gris.
  const base = compact
    ? 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-500'
    : 'px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-500';
  return (
    <th className={`${base} ${className}`}>
      {children}
    </th>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-stone-100 bg-white">{children}</tbody>;
}

export function TableRow({ children, hover = true }) {
  return (
    <tr className={hover ? 'hover:bg-stone-50/80 transition-colors' : ''}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', compact, colSpan, rowSpan }) {
  // Filas con algo más de aire: la referencia aprobada respira más que la
  // versión anterior, y el contenido se lee mejor sin alargar mucho la tabla.
  const pad = compact ? 'px-3 py-2.5' : 'px-6 py-4';
  return (
    <td colSpan={colSpan} rowSpan={rowSpan} className={`${pad} text-sm text-stone-700 ${className}`}>
      {children}
    </td>
  );
}

/**
 * Dato principal de una fila (nombre de cliente, de barbero, etc.) con una
 * línea secundaria opcional debajo para estado o contexto.
 *
 * Existe para que todos los listados resuelvan igual el mismo patrón: antes
 * cada módulo apilaba sus propios `div` con tamaños distintos.
 */
export function TablePrimaryCell({ children, secondary, muted = false, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className={`text-sm font-semibold ${muted ? 'text-stone-400' : 'text-stone-900'}`}>
        {children}
      </div>
      {secondary ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
