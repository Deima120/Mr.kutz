/**
 * Controles estandarizados para listados admin: filtros, paginación y tarjetas.
 */

import DataCard from '@/shared/components/admin/DataCard';
import CustomSelect from '@/shared/components/CustomSelect';

const CHIP_BASE =
  'inline-flex items-center rounded-full border font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40';

export const CHIP_SIZES = {
  md: 'px-3.5 py-1.5 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

/** Fila de filtros: flex compacto; en móvil 2 columnas proporcionales. */
export const ADMIN_FILTER_GRID_CLASS =
  'flex flex-wrap items-end gap-x-2.5 gap-y-3 sm:gap-x-3 w-full';

/** Ancho estándar de un control de filtro (no estira a todo el ancho). */
export const ADMIN_FILTER_FIELD_CLASS =
  'flex flex-col gap-0.5 min-w-0 w-[calc(50%-0.3125rem)] sm:w-auto sm:min-w-[7.5rem] sm:max-w-[11.5rem] shrink-0';

export const ADMIN_FILTER_DATE_CLASS =
  'select-premium w-full py-1.5 pl-2.5 pr-2 text-xs min-h-[2rem] text-stone-900 rounded-lg';

export const ADMIN_FILTER_LABEL_CLASS =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 leading-none';

export function chipClassName(active, size = 'md') {
  const sizeClass = CHIP_SIZES[size] || CHIP_SIZES.md;
  if (active) {
    return `${CHIP_BASE} ${sizeClass} border-barber-dark bg-barber-dark text-white shadow-md`;
  }
  return `${CHIP_BASE} ${sizeClass} border-stone-200 bg-white text-stone-700 hover:border-gold/45 hover:text-barber-dark`;
}

export const PAGE_SIZE_SELECT_CLASS = 'select-premium py-1.5 pl-3 pr-9 text-xs sm:text-sm min-h-[2.125rem]';

export const FILTER_SELECT_CLASS = 'select-premium py-2 pl-3.5 pr-10 text-sm min-h-[2.5rem]';

export const PAGINATION_BTN_CLASS =
  'inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none';

export function AdminFilterRow({ children, className = '' }) {
  return <div className={`${ADMIN_FILTER_GRID_CLASS} ${className}`.trim()}>{children}</div>;
}

export function AdminFilterDate({ id, label, value, onChange, className = '', disabled = false }) {
  return (
    <div className={`${ADMIN_FILTER_FIELD_CLASS} ${className}`.trim()}>
      <label htmlFor={id} className={ADMIN_FILTER_LABEL_CLASS}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${ADMIN_FILTER_DATE_CLASS} disabled:opacity-50`}
      />
    </div>
  );
}

export function FilterChip({ active, onClick, children, size = 'md', className = '', disabled = false, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`${chipClassName(active, size)} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function FilterChipGroup({ label, summary, ariaLabel, children, className = '' }) {
  return (
    <div className={`min-w-0 flex-1 max-w-full space-y-2 ${className}`.trim()}>
      {summary ? <p className="text-xs text-stone-500 leading-snug">{summary}</p> : null}
      <div className="min-w-0 w-full">
        {label ? <span className={`${ADMIN_FILTER_LABEL_CLASS} normal-case tracking-wider text-stone-500 block mb-1.5`}>{label}</span> : null}
        <div className="min-w-0 w-full" role="group" aria-label={ariaLabel || label || 'Filtros'}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Desplegable compacto para filtros de listados admin. */
export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
  selectClassName = '',
  disabled = false,
  variant = 'filter',
}) {
  return (
    <div className={`${ADMIN_FILTER_FIELD_CLASS} ${className}`.trim()}>
      {label ? (
        <span id={id ? `${id}-label` : undefined} className={ADMIN_FILTER_LABEL_CLASS}>
          {label}
        </span>
      ) : null}
      <CustomSelect
        id={id}
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={ariaLabel || label}
        disabled={disabled}
        variant={variant}
        className="w-full"
        selectClassName={`w-full min-w-0 ${selectClassName}`.trim()}
      />
    </div>
  );
}

/** Alias de FilterSelect — todos los filtros segmentados usan desplegable. */
export function SegmentedFilter(props) {
  return <FilterSelect {...props} />;
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
      <div className="flex items-center gap-2 min-w-0">
        <label htmlFor={`${idPrefix}-page-size`} className="text-xs font-semibold text-stone-500 whitespace-nowrap">
          Por página
        </label>
        <CustomSelect
          id={`${idPrefix}-page-size`}
          value={String(pageSize)}
          onChange={(next) => onPageSizeChange(Number(next))}
          options={pageSizeOptions.map((n) => ({ id: String(n), label: String(n) }))}
          ariaLabel="Registros por página"
          disabled={isDisabled}
          variant="adminCompact"
          className="w-auto min-w-[4.5rem]"
        />
      </div>
      <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto" role="navigation" aria-label="Cambiar página">
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
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 shrink-0 w-full sm:w-auto">{controls}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center sm:justify-end gap-3 sm:gap-4 shrink-0 w-full min-w-0 ${
        layout === 'toolbar'
          ? 'lg:pl-6 lg:border-l lg:border-stone-200/90 pt-3 border-t border-stone-200/90 lg:border-t-0 lg:pt-0'
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
  const hasTopFilters = Boolean(topFilters);
  const hasPagination = Boolean(pagination);

  return (
    <DataCard className={`max-w-full min-w-0 !overflow-visible ${cardClassName}`.trim()} compact>
      <div className={`w-full min-w-0 max-w-full flex flex-col gap-3 ${className}`.trim()}>
        {summary ? <p className="text-xs text-stone-500 leading-snug">{summary}</p> : null}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-5 w-full">
          {filters ? (
            <FilterChipGroup ariaLabel={filterAriaLabel} label={filterLabel}>
              {filters}
            </FilterChipGroup>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          {hasTopFilters || hasPagination ? (
            <div className="flex flex-col gap-2.5 shrink-0 min-w-0 w-full lg:w-auto lg:items-end border-t border-stone-100 pt-3 lg:border-t-0 lg:pt-0">
              {hasTopFilters ? <div className="w-full lg:w-auto min-w-0">{topFilters}</div> : null}
              {hasPagination ? pagination : null}
            </div>
          ) : null}
        </div>
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
