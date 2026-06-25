/**
 * Tarjeta estandarizada para paneles del dashboard (KPI, gráficas, bloques).
 */

const VARIANTS = {
  default: 'bg-white border-stone-200/80',
  soft: 'bg-gradient-to-br from-white via-stone-50/70 to-gold/[0.04] border-stone-200/80',
  chart: 'bg-gradient-to-br from-white via-stone-50/50 to-stone-100/40 border-stone-200/80',
};

const EYEBROW_TONES = {
  gold: 'text-gold',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  violet: 'text-violet-700',
  rose: 'text-rose-700',
  indigo: 'text-indigo-700',
  sky: 'text-sky-700',
  cyan: 'text-cyan-700',
};

export function DashboardChartPanel({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-stone-100 bg-stone-50/75 p-4 sm:p-5 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default function DashboardCard({
  title,
  subtitle,
  eyebrow,
  eyebrowTone = 'gold',
  variant = 'default',
  accent = true,
  compact = false,
  noPadding = false,
  className = '',
  children,
  footer,
}) {
  const headerPad = compact ? 'px-4 sm:px-5 pt-4 sm:pt-5' : 'px-5 sm:px-6 pt-5 sm:pt-6';
  const bodyPad = compact ? 'px-4 sm:px-5 pb-4 sm:pb-5' : 'px-5 sm:px-6 pb-5 sm:pb-6';
  const hasHeader = Boolean(title || subtitle || eyebrow);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border shadow-card ${VARIANTS[variant] || VARIANTS.default} ${className}`.trim()}
    >
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80"
          aria-hidden
        />
      )}
      <div
        className="pointer-events-none absolute top-0 right-0 h-28 w-28 rounded-bl-[100%] bg-gold/[0.06]"
        aria-hidden
      />

      {hasHeader && (
        <header className={`relative ${headerPad} ${noPadding ? 'pb-0' : ''}`}>
          {eyebrow && (
            <p className={`mb-1 text-xs font-bold tracking-[0.18em] ${EYEBROW_TONES[eyebrowTone] || EYEBROW_TONES.gold}`}>
              {eyebrow}
            </p>
          )}
          {title && <h2 className="font-serif text-lg font-medium text-stone-900">{title}</h2>}
          {subtitle && <p className="mt-1 text-xs text-stone-500">{subtitle}</p>}
        </header>
      )}

      <div className={`relative ${noPadding ? '' : `${bodyPad} ${hasHeader ? 'pt-3 sm:pt-4' : ''}`}`}>
        {children}
      </div>

      {footer && <footer className="relative px-5 pb-5 sm:px-6 sm:pb-6">{footer}</footer>}
    </section>
  );
}
