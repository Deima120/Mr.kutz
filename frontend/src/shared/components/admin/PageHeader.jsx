/**
 * Barra de página admin — sin duplicar el título del layout (variant toolbar por defecto).
 */

export default function PageHeader({
  title,
  actions,
  subtitle,
  label,
  filters,
  compact = true,
  variant = 'toolbar',
}) {
  if (variant === 'card') {
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
            {subtitle && <p className="text-stone-500 text-sm break-words">{subtitle}</p>}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 min-w-0 sm:justify-end">{actions}</div>
          )}
        </div>
      </div>
    );
  }

  const hasContext = title || subtitle;
  const hasToolbar = hasContext || filters || actions;
  if (!hasToolbar) return null;

  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between min-w-0">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2 min-w-0 flex-1">
        {hasContext && (
          <div className="min-w-0 shrink-0">
            {title && <p className="text-sm font-semibold text-stone-900">{title}</p>}
            {subtitle && (
              <p className={`text-xs text-stone-500 ${title ? 'mt-0.5' : ''}`}>{subtitle}</p>
            )}
          </div>
        )}
        {filters}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">{actions}</div>
      )}
    </div>
  );
}
