/**
 * Envoltorio visual unificado para formularios del panel admin:
 * bleed horizontal, atmósfera, rejilla formulario + panel editorial.
 */

import { Link } from 'react-router-dom';

/** Clase para inputs/selects/textarea en formularios admin (profundidad sutil). */
export const ADMIN_FORM_FIELD_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-900 placeholder-stone-400 transition-all duration-300 ' +
  'bg-stone-50/80 border border-stone-200/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.04)] ' +
  'focus:bg-white focus:border-gold/50 focus:ring-2 focus:ring-gold/25 focus:shadow-[0_0_0_1px_rgba(201,169,98,0.15)] outline-none';

export const ADMIN_FORM_LABEL_CLASS =
  'block text-[11px] font-bold tracking-wider text-stone-500 mb-1.5 group-focus-within:text-gold-dark transition-colors';

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
  backLabel,
  modeBadge,
  showAside = true,
  aside,
  children,
  fullBleed = true,
}) {
  const asideVisible = showAside && aside && Array.isArray(aside.bullets) && aside.bullets.length > 0;

  const bleedWidth =
    fullBleed
      ? 'w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -mx-6 md:-mx-8'
      : 'w-full min-w-0';
  const rootMinHeight = fullBleed ? 'min-h-0' : 'min-h-[min(72vh,52rem)]';

  return (
    <div
      className={`relative flex-1 ${rootMinHeight} ${bleedWidth} flex flex-col overflow-x-hidden overflow-y-hidden`}
    >
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-stone-300/35 via-stone-100 to-stone-200/50" aria-hidden />
      <div
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_90%_70%_at_100%_0%,rgba(201,169,98,0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(12,10,9,0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-20 opacity-[0.32] bg-section-pattern mix-blend-multiply pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-0 right-[15%] w-[min(42vw,28rem)] h-[min(42vw,28rem)] rounded-full bg-gold/12 blur-3xl -z-10 animate-float pointer-events-none"
        aria-hidden
      />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-barber-dark/[0.06] blur-3xl -z-10 pointer-events-none" aria-hidden />

      <div className="relative z-[1] flex-1 min-h-0 flex flex-col px-5 md:px-7 pt-1 pb-4 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
          <Link
            to={backTo}
            className="group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-stone-600 bg-white/70 backdrop-blur-sm border border-stone-200/90 shadow-sm hover:border-gold/40 hover:text-barber-dark transition-all"
          >
            <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
              ←
            </span>
            {backLabel}
          </Link>
          <span className="h-px flex-1 min-w-[3rem] bg-gradient-to-r from-gold/55 to-stone-300/40 rounded-full" />
          {modeBadge && (
            <span className="text-[10px] font-bold tracking-[0.28em] text-gold">{modeBadge}</span>
          )}
        </div>

        <div
          className={`flex-1 min-h-0 grid gap-5 lg:gap-6 xl:gap-8 items-stretch max-w-[88rem] mx-auto w-full ${
            asideVisible ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
          }`}
        >
          <div className={asideVisible ? 'lg:col-span-7 xl:col-span-8 flex flex-col min-h-0' : 'flex flex-col min-h-0'}>
            <div className="relative flex-1 min-h-0 rounded-[1.35rem] p-[1.5px] bg-gradient-to-br from-gold/65 via-stone-100/60 to-gold/35 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="absolute -inset-2 bg-gradient-to-br from-gold/8 to-transparent rounded-3xl blur-xl -z-10 opacity-80" aria-hidden />
              {children}
            </div>
          </div>

          {asideVisible && (
            <aside className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 gap-4">
              <div className="flex-1 min-h-0 rounded-[1.35rem] bg-gradient-to-b from-barber-dark via-barber-charcoal to-barber-dark text-stone-300 p-6 sm:p-7 shadow-[0_28px_60px_rgba(0,0,0,0.28)] border border-stone-800 relative overflow-hidden flex flex-col">
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                <div className="relative flex-1 flex flex-col">
                  <p className="text-[10px] tracking-[0.35em] text-gold/90 font-semibold">
                    {aside.kicker ?? 'Experiencia'}
                  </p>
                  <h2 className="font-serif text-xl sm:text-2xl text-white font-medium mt-3 mb-5 leading-snug">
                    {aside.title}
                  </h2>
                  {aside.subtitle ? (
                    <p className="text-sm text-stone-500 -mt-3 mb-4">{aside.subtitle}</p>
                  ) : null}
                  <ul className="text-sm text-stone-400 space-y-4 flex-1">
                    {aside.bullets.map((line, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-gold mt-0.5">●</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {(aside.statusLabel || aside.statusValue) && (
                    <div className="mt-6 pt-5 border-t border-stone-700/80">
                      {aside.statusLabel && (
                        <p className="text-[10px] tracking-widest text-stone-500 mb-2">{aside.statusLabel}</p>
                      )}
                      {aside.statusValue && <p className="font-medium text-white">{aside.statusValue}</p>}
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
