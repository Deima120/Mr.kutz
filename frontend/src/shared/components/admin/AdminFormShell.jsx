/**
 * Envoltorio visual unificado para formularios del panel admin:
 * bleed horizontal, atmósfera, rejilla formulario + panel editorial.
 */

import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/** Clase para inputs/selects/textarea en formularios admin (profundidad sutil). */
export const ADMIN_FORM_FIELD_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-900 placeholder-stone-400 transition-all duration-300 ' +
  'bg-stone-50/80 border border-stone-200/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.04)] ' +
  'focus:bg-white focus:border-gold/50 focus:ring-2 focus:ring-gold/25 focus:shadow-[0_0_0_1px_rgba(201,169,98,0.15)] outline-none';

export const ADMIN_FORM_LABEL_CLASS =
  'block text-[11px] font-bold tracking-wider text-stone-500 mb-1.5 group-focus-within:text-gold-dark transition-colors';

/** Tarjeta del formulario — blanca, flotante sobre el panel. */
export const ADMIN_FORM_CARD_CLASS =
  'relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white border border-stone-100/90 shadow-[0_8px_32px_rgba(0,0,0,0.07)] overflow-hidden';

export const ADMIN_FORM_INNER_CLASS =
  'px-4 py-3 sm:px-5 sm:py-4 flex flex-col min-h-0 gap-2.5 flex-1 overflow-y-auto';

export const ADMIN_FORM_FIELD_COMPACT = `${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`;

export const ADMIN_FORM_ERROR_CLASS = 'alert-error shrink-0 text-xs py-2';

export const ADMIN_FORM_GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 shrink-0';

export function AdminFormGoldBar() {
  return (
    <div
      className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80"
      aria-hidden
    />
  );
}

export function AdminFormCard({ onSubmit, children, className = '', noValidate = true }) {
  return (
    <form onSubmit={onSubmit} noValidate={noValidate} className={`${ADMIN_FORM_CARD_CLASS} ${className}`}>
      <AdminFormGoldBar />
      <div className={ADMIN_FORM_INNER_CLASS}>{children}</div>
    </form>
  );
}

export function AdminFormPreviewField({ label, value, multiline = false, breakAll = false }) {
  if (!value && value !== 0) {
    return (
      <div>
        <p className="text-[10px] tracking-widest text-stone-500 mb-1">{label}</p>
        <p className="text-white font-medium">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] tracking-widest text-stone-500 mb-1">{label}</p>
      <p
        className={`font-medium ${
          multiline ? 'text-stone-400 text-sm leading-relaxed' : 'text-white'
        } ${breakAll ? 'text-sm break-all' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

export function AdminFormPreviewPanel({ children }) {
  return <div className="space-y-4 mt-6">{children}</div>;
}

export function AdminFormLoadingButton({ loading, loadingLabel, children }) {
  if (loading) {
    return (
      <>
        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {loadingLabel}
      </>
    );
  }
  return children;
}

/** Cabecera interior de la tarjeta (debajo de la línea dorada). */
export function AdminFormCardHeader({ eyebrow, title }) {
  return (
    <header className="shrink-0 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold tracking-[0.28em] text-gold mb-1">{eyebrow}</p>
        )}
        <h1 className="font-serif text-xl sm:text-2xl xl:text-[1.65rem] text-stone-900 font-medium tracking-tight">{title}</h1>
      </div>
      <div className="shrink-0 rounded-xl bg-barber-dark px-3 py-2 text-center shadow-lg border border-stone-700/60">
        <p className="text-[8px] tracking-widest text-stone-500">Mr.</p>
        <p className="font-serif text-sm text-gold leading-none">Kutz</p>
      </div>
    </header>
  );
}

/** Botones primario / secundario al pie del formulario. */
export function AdminFormFooterActions({ children, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 pt-2 shrink-0 border-t border-stone-200/90 mt-auto ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminFormPrimaryButton({ children, disabled, type = 'submit', className = '' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-barber-dark to-barber-charcoal shadow-lg hover:shadow-gold-glow disabled:opacity-50 transition-all border border-stone-800/50 ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminFormSecondaryButton({ children, onClick, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-stone-600 bg-white border border-stone-200 shadow-sm hover:bg-stone-50 transition-all ${className}`}
    >
      {children}
    </button>
  );
}

const ADMIN_BACK_NAV_CLASS =
  'group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-stone-600 bg-white border border-stone-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-gold/40 hover:text-barber-dark transition-all';

/** Enlace/botón de regreso en esquina superior (listados, fichas, formularios). */
export function AdminBackNav({ to, label = 'Volver', onClick, className = '' }) {
  const content = (
    <>
      <ChevronLeft
        className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
        strokeWidth={2}
        aria-hidden
      />
      {label}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${ADMIN_BACK_NAV_CLASS} ${className}`}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className={`${ADMIN_BACK_NAV_CLASS} ${className}`}>
      {content}
    </Link>
  );
}

/**
 * @param {object} props
 * @param {string} props.backTo
 * @param {string} props.backLabel
 * @param {string} props.modeBadge — ej. "Alta", "Edición"
 * @param {boolean} [props.showAside=true]
 * @param {{ title: string, subtitle: string, bullets: string[], statusLabel?: string, statusValue?: string }} [props.aside]
 * @param {boolean} [props.fullBleed=true] — Si es false (p. ej. vista cliente), sin márgenes negativos; el contenedor padre aporta el ancho.
 */
export default function AdminFormShell({
  backTo,
  backLabel = 'Volver',
  onBackClick,
  modeBadge,
  showAside = true,
  aside,
  children,
  fullBleed = true,
  compact = false,
  contained = false,
  fillHeight = false,
  showBackNav = true,
}) {
  const asideVisible = showAside && aside && (Array.isArray(aside.bullets) && aside.bullets.length > 0 || aside.children);

  const formWrapClass = contained
    ? 'relative flex-1 min-h-0 w-full'
    : 'relative flex-1 min-h-0 w-full';

  const contentPad = contained
    ? 'p-0'
    : compact
      ? 'px-0 pt-0 pb-3'
      : 'px-0 pt-0 pb-4';

  const backNavOffset = showBackNav ? (compact ? 'pt-11' : 'pt-12') : '';

  return (
    <div
      className={`relative flex-1 min-h-0 w-full min-w-0 flex flex-col overflow-x-hidden ${contained || fillHeight ? 'overflow-y-visible' : 'overflow-y-hidden'} ${contained ? '' : 'animate-fade-in-up'}`}
    >
      {showBackNav && (
        <div className={`absolute top-0 left-0 z-20 ${compact ? '' : 'md:left-1'}`}>
          <AdminBackNav
            to={backTo}
            label={backLabel}
            onClick={onBackClick}
          />
        </div>
      )}

      <div className={`relative z-[1] flex-1 min-h-0 flex flex-col ${fillHeight ? 'h-full' : ''} ${contentPad} ${backNavOffset}`}>
        <div
          className={`flex-1 min-h-0 grid items-stretch max-w-[88rem] mx-auto w-full ${
            fillHeight ? 'h-full overflow-hidden' : ''
          } ${
            compact ? 'gap-4 lg:gap-5' : 'gap-5 lg:gap-6 xl:gap-8'
          } ${
            asideVisible ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
          }`}
        >
          <div className={asideVisible ? `${compact ? 'lg:col-span-7' : 'lg:col-span-7 xl:col-span-8'} flex flex-col min-h-0 ${fillHeight ? 'h-full overflow-hidden' : ''}` : `flex flex-col min-h-0 ${fillHeight ? 'h-full overflow-hidden' : ''}`}>
            <div className={`${formWrapClass} ${fillHeight ? 'h-full min-h-0 flex flex-col overflow-hidden' : ''}`}>
              {children}
            </div>
          </div>

          {asideVisible && (
            <aside className={`${fillHeight ? 'hidden lg:flex' : 'flex'} flex-col min-h-0 ${compact ? 'lg:col-span-5' : 'lg:col-span-5 xl:col-span-4'} ${fillHeight ? 'h-full overflow-hidden' : ''}`}>
              <div className={`min-h-0 rounded-2xl bg-gradient-to-b from-barber-dark via-barber-charcoal to-barber-dark text-stone-300 ${contained ? 'p-4 sm:p-5' : compact ? 'p-5 sm:p-6' : 'p-6 sm:p-7'} shadow-[0_28px_60px_rgba(0,0,0,0.28)] border border-stone-800 relative overflow-hidden flex flex-col ${fillHeight ? 'h-full' : ''}`}>
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                <div className="relative flex flex-col">
                  <p className={`tracking-[0.35em] text-gold/90 font-semibold ${compact ? 'text-[10px]' : 'text-[10px]'}`}>
                    {aside.kicker ?? 'Experiencia'}
                  </p>
                  <h2 className={`font-serif text-white font-medium leading-snug ${compact ? 'text-lg sm:text-xl mt-2 mb-4' : 'text-xl sm:text-2xl mt-3 mb-5'}`}>
                    {aside.title}
                  </h2>
                  {aside.subtitle ? (
                    <p className={`text-stone-500 -mt-2 mb-4 ${compact ? 'text-xs' : 'text-sm'}`}>{aside.subtitle}</p>
                  ) : null}
                  {aside.children ? (
                    <div>{aside.children}</div>
                  ) : (
                    <ul className={`text-sm text-stone-400 flex-1 ${compact ? 'space-y-2' : 'space-y-4'}`}>
                      {aside.bullets && aside.bullets.map((line, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="text-gold mt-0.5">●</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(aside.statusLabel || aside.statusValue) && (
                    <div className={`border-t border-stone-700/80 ${compact ? 'mt-4 pt-4' : 'mt-6 pt-5'}`}>
                      {aside.statusLabel && (
                        <p className="text-[10px] tracking-widest text-stone-500 mb-1">{aside.statusLabel}</p>
                      )}
                      {aside.statusValue && <p className="font-medium text-white text-sm sm:text-[15px]">{aside.statusValue}</p>}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
