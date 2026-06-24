/**
 * Botones estilo App Store / Google Play para descarga de la app móvil.
 */

const BADGE_BASE =
  'inline-flex items-center gap-3 rounded-xl border transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold no-underline w-full';

function badgeSizeClass(compact) {
  return compact ? 'px-3 py-2 gap-2.5' : 'px-4 py-3 min-w-[168px]';
}

function iconSizeClass(compact) {
  return compact ? 'h-5 w-5' : 'h-7 w-7';
}

const BADGE_ACTIVE =
  'border-white/15 bg-white/[0.07] hover:border-gold/50 hover:bg-gold/10 hover:shadow-[0_12px_40px_rgba(201,162,39,0.18)] hover:-translate-y-0.5';

const BADGE_DISABLED =
  'border-white/10 bg-white/[0.03] opacity-55 cursor-not-allowed pointer-events-none';

function AppleIcon({ compact = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${iconSizeClass(compact)} shrink-0 fill-current`} aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function PlayIcon({ compact = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${iconSizeClass(compact)} shrink-0`} aria-hidden>
      <path
        fill="#EA4335"
        d="M3.6 2.4A1.2 1.2 0 0 0 2.4 3.6v16.8a1.2 1.2 0 0 0 1.8 1.04l14.4-8.4a1.2 1.2 0 0 0 0-2.08L3.6 2.4z"
      />
      <path
        fill="#FBBC04"
        d="M3.6 2.4 18 12 3.6 21.6V2.4z"
        opacity="0.85"
      />
      <path
        fill="#34A853"
        d="M18 12 3.6 21.6l14.4-8.4L18 12z"
        opacity="0.7"
      />
      <path
        fill="#4285F4"
        d="M18 12 3.6 2.4 18 12z"
        opacity="0.9"
      />
    </svg>
  );
}

function BadgeContent({ store, title, subtitle, compact = false }) {
  return (
    <>
      {store === 'apple' ? <AppleIcon compact={compact} /> : <PlayIcon compact={compact} />}
      <span className="text-left leading-tight min-w-0">
        <span className={`block uppercase tracking-wider text-stone-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {subtitle}
        </span>
        <span className={`block font-semibold text-white ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
      </span>
    </>
  );
}

export function AppStoreBadge({ href, disabled = false, compact = false }) {
  const className = `${BADGE_BASE} ${badgeSizeClass(compact)} ${disabled ? BADGE_DISABLED : BADGE_ACTIVE}`;

  if (disabled || !href) {
    return (
      <span className={className} aria-disabled="true">
        <BadgeContent store="apple" subtitle="Disponible en" title="App Store" compact={compact} />
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label="Descargar en App Store"
    >
      <BadgeContent store="apple" subtitle="Disponible en" title="App Store" compact={compact} />
    </a>
  );
}

export function GooglePlayBadge({ href, disabled = false, compact = false }) {
  const className = `${BADGE_BASE} ${badgeSizeClass(compact)} ${disabled ? BADGE_DISABLED : BADGE_ACTIVE}`;

  if (disabled || !href) {
    return (
      <span className={className} aria-disabled="true">
        <BadgeContent store="google" subtitle="Disponible en" title="Google Play" compact={compact} />
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label="Descargar en Google Play"
    >
      <BadgeContent store="google" subtitle="Disponible en" title="Google Play" compact={compact} />
    </a>
  );
}

export function ApkDownloadButton({ href, disabled = false, compact = false }) {
  const className = `inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold no-underline w-full ${
    compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'
  } ${
    disabled || !href
      ? `${BADGE_DISABLED} text-stone-500`
      : 'border-gold/40 text-gold hover:bg-gold hover:text-barber-dark hover:border-gold'
  }`;

  if (disabled || !href) {
    return (
      <span className={className} aria-disabled="true">
        <DownloadIcon />
        Descargar APK
      </span>
    );
  }

  return (
    <a href={href} download className={className} aria-label="Descargar APK para Android">
      <DownloadIcon />
      Descargar APK
    </a>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0 4-4m-4 4-4-4M4 18h16" />
    </svg>
  );
}
