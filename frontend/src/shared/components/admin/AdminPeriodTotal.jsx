/**
 * Chip con el total acumulado del periodo consultado, para la barra de acciones
 * de los listados de dinero (Ventas, Gastos…).
 *
 * Nace de un bloque que estaba copiado igual en Ventas y en Gastos: cada copia
 * podía derivar por su lado y ya usaban tamaños de 10px que no se leían. Al
 * centralizarlo, cualquier listado nuevo que muestre un total de periodo se ve
 * igual sin volver a escribirlo.
 */
export default function AdminPeriodTotal({ label, amount, count, countLabel, className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 ${className}`.trim()}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">{label}</p>
        <p className="whitespace-nowrap font-serif text-lg font-medium leading-tight tabular-nums text-gold-dark">
          {amount}
        </p>
      </div>
      {count != null && (
        <span className="shrink-0 whitespace-nowrap border-l border-stone-200 pl-3 text-xs text-stone-500">
          {count} {countLabel}
        </span>
      )}
    </div>
  );
}
