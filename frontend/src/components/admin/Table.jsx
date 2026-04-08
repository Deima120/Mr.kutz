/**
 * Tabla administrativa — diseño premium (stone, gold accents)
 */

export default function Table({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200/80">
      <table className="w-full text-sm">
        {children}
      </table>
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
  const base = compact
    ? 'px-3 py-2 text-left text-[11px] font-semibold text-stone-600'
    : 'px-6 py-3.5 text-left text-xs font-semibold text-stone-600 tracking-wider';
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
  const pad = compact ? 'px-3 py-2' : 'px-6 py-4';
  return (
    <td colSpan={colSpan} rowSpan={rowSpan} className={`${pad} text-stone-700 ${className}`}>
      {children}
    </td>
  );
}
