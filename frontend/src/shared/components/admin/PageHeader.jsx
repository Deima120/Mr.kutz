/**
 * Encabezado de página — diseño premium alineado con HomePage
 */

export default function PageHeader({ title, actions, subtitle, label, compact = false }) {
  return (
    <div
      className={`panel-card max-w-full min-w-0 ${compact ? 'mb-4 p-4 sm:p-5' : 'mb-8 p-5 sm:p-6'}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          {label && (
            <p className={`section-label text-gold ${compact ? 'mb-0.5' : 'mb-1'}`}>{label}</p>
          )}
          <h1
            className={`font-serif text-stone-900 font-medium tracking-tight mb-1 ${
              compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-stone-500 text-sm break-words">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 min-w-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
