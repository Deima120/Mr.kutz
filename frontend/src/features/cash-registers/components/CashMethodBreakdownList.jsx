/**
 * Desglose compacto por método (panel en vivo + modal de cierre).
 */

import { formatMoney } from '@/shared/utils/money';

export default function CashMethodBreakdownList({
  byMethod = [],
  emptyText = 'Sin cobros registrados.',
  className = '',
}) {
  const rows = Array.isArray(byMethod) ? byMethod : [];
  if (rows.length === 0) {
    return <p className={`text-sm text-stone-500 ${className}`.trim()}>{emptyText}</p>;
  }

  return (
    <ul className={`grid gap-2 sm:grid-cols-2 ${className}`.trim()}>
      {rows.map((m) => (
        <li
          key={m.paymentMethodId}
          className="rounded-xl border border-stone-200/80 bg-white px-3 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900 truncate">
              {m.paymentMethodName || `Método #${m.paymentMethodId}`}
            </p>
            {m.isCash ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                Efectivo
              </span>
            ) : null}
          </div>
          <p className="font-serif text-xl font-medium text-stone-900 tabular-nums mt-1">
            {formatMoney(m.amount)}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {m.paymentCount} cobro{m.paymentCount === 1 ? '' : 's'}
          </p>
        </li>
      ))}
    </ul>
  );
}
