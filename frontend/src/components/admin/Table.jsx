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

export function TableHeader({ children, className = '' }) {
  return (
    <th className={`px-6 py-3.5 text-left text-xs font-semibold text-stone-600 tracking-wider ${className}`}>
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

export function TableCell({ children, className = '' }) {
  return (
    <td className={`px-6 py-4 text-stone-700 ${className}`}>
      {children}
    </td>
  );
}
