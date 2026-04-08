/**
 * Encabezado de página — diseño premium alineado con HomePage
 */

export default function PageHeader({ title, actions, subtitle, label, compact }) {
  if (compact) {
    return (
      <div className="mb-4 rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {label && <p className="text-[10px] font-semibold text-gold mb-0.5">{label}</p>}
            <h1 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && <p className="text-stone-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-8 panel-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {label && (
            <p className="section-label text-gold mb-1">{label}</p>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-stone-500 text-sm">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
