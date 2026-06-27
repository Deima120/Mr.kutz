/**
 * Controles estandarizados para listados admin: píldoras, segmentos y paginación.
 */

import DataCard from '@/shared/components/admin/DataCard';

const CHIP_BASE =
  'inline-flex items-center rounded-full border font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40';

export const CHIP_SIZES = {
  md: 'px-3.5 py-1.5 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

export function chipClassName(active, size = 'md') {
  const sizeClass = CHIP_SIZES[size] || CHIP_SIZES.md;
  if (active) {
    return `${CHIP_BASE} ${sizeClass} border-barber-dark bg-barber-dark text-white shadow-md`;
  }
  return `${CHIP_BASE} ${sizeClass} border-stone-200 bg-white text-stone-700 hover:border-gold/45 hover:text-barber-dark`;
}

export const PAGE_SIZE_SELECT_CLASS =
  'rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-gold focus:ring-2 focus:ring-gold/40 outline-none';

export const PAGINATION_BTN_CLASS =
  'inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none';

export function FilterChip({ active, onClick, children, size = 'md', className = '', ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${chipClassName(active, size)} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function FilterChipGroup({ label, summary, ariaLabel, children, className = '' }) {
  return (
    <div className={`min-w-0 flex-1 max-w-full space-y-3 ${className}`.trim()}>
      {summary && <p className="text-xs text-stone-500">{summary}</p>}
      <div>
        {label && (
          <span className="text-[11px] font-bold tracking-wider text-stone-500 block mb-2">{label}</span>
        )}
        <div
          className="flex flex-wrap gap-2 min-w-0 max-w-full"
          role="group"
          aria-label={ariaLabel || label || 'Filtros'}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SegmentedFilter({ options, value, onChange, ariaLabel, size = 'sm', className = '' }) {
  return (
    <div
      className={`inline-flex flex-wrap gap-2 min-w-0 ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <FilterChip
          key={opt.id}
          active={value === opt.id}
          onClick={() => onChange(opt.id)}
          size={size}
        >
          {opt.label}
        </FilterChip>
      ))}
    </div>
  );
}

export function AdminPagination({
  idPrefix = 'list',
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'registros',
  showSummary = false,
  layout = 'toolbar',
  disabled = false,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const isDisabled = disabled || total <= 0;

  const controls = (
    <>
      <div className="flex items-center gap-2">
        <label htmlFor={`${idPrefix}-page-size`} className="text-xs font-semibold text-stone-500 whitespace-nowrap">
          Por página
        </label>
        <select
          id={`${idPrefix}-page-size`}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={isDisabled}
          className={`${PAGE_SIZE_SELECT_CLASS} w-auto min-w-[4.5rem] py-1.5 text-xs sm:text-sm disabled:opacity-50`}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2" role="navigation" aria-label="Cambiar página">
        <button
          type="button"
          disabled={isDisabled || safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className={PAGINATION_BTN_CLASS}
        >
          Anterior
        </button>
        <span className="text-xs sm:text-sm font-semibold text-stone-800 tabular-nums min-w-[2.75rem] text-center px-0.5">
          {safePage}/{totalPages}
        </span>
        <button
          type="button"
          disabled={isDisabled || safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className={PAGINATION_BTN_CLASS}
        >
          Siguiente
        </button>
      </div>
    </>
  );

  if (layout === 'bar') {
    if (total <= 0 && !showSummary) return null;
    return (
      <div
        className={`mb-3 pb-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`.trim()}
      >
        {showSummary && (
          <p className="text-xs sm:text-sm text-stone-500 font-semibold">
            Página {safePage} de {totalPages} · {total} {itemLabel}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">{controls}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 ${
        layout === 'toolbar'
          ? 'lg:pl-6 lg:border-l lg:border-stone-200/90 pt-3 border-t border-stone-200/90 lg:border-t-0 lg:pt-0 min-w-0'
          : ''
      } ${className}`.trim()}
    >
      {controls}
    </div>
  );
}

export function AdminListToolbar({
  summary,
  filterLabel,
  filterAriaLabel,
  filters,
  pagination,
  topFilters,
  className = '',
  cardClassName = '',
}) {
  const rightColumn = topFilters || pagination;

  return (
    <DataCard className={`max-w-full min-w-0 ${cardClassName}`.trim()}>
      <div
        className={`w-full min-w-0 max-w-full flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8 ${className}`.trim()}
      >
        {filters ? (
          <FilterChipGroup label={filterLabel} summary={summary} ariaLabel={filterAriaLabel}>
            {filters}
          </FilterChipGroup>
        ) : summary ? (
          <p className="text-xs text-stone-500 min-w-0 flex-1">{summary}</p>
        ) : (
          <div className="flex-1 min-w-0" />
        )}
        {rightColumn ? (
          <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0 min-w-0 w-full lg:w-auto">
            {topFilters ? (
              <div className="flex justify-end w-full">{topFilters}</div>
            ) : null}
            {pagination}
          </div>
        ) : null}
      </div>
    </DataCard>
  );
}

/** Tarjeta de ítem en grillas de listado (servicios, barberos, etc.). */
export function AdminEntityCard({ children, className = '', inactive = false }) {
  return (
    <article
      className={`rounded-xl border border-stone-200/90 bg-white p-4 shadow-card min-w-0 ${
        inactive ? 'opacity-80' : ''
      } ${className}`.trim()}
    >
      {children}
    </article>
  );
}
