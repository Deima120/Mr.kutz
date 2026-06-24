/**
 * Botón flotante + ventana compacta para descargar la app móvil.
 */

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/shared/contexts/SettingsContext';
import { getMobileAppLinks } from '@/features/home/config/mobileAppLinks';
import { AppStoreBadge, ApkDownloadButton, GoogleDriveDownloadButton, GooglePlayBadge } from '@/features/home/components/StoreBadgeButton';

function PhoneIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path strokeLinecap="round" d="M11 18h2" />
    </svg>
  );
}

export default function MobileAppFloating() {
  const { businessName } = useSettings();
  const { iosUrl, androidUrl, driveUrl, apkUrl, hasAnyDownload } = getMobileAppLinks();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {open && (
        <div
          id="app-movil"
          role="dialog"
          aria-labelledby="mobile-app-title"
          aria-modal="true"
          className="w-[min(100vw-2.5rem,18rem)] rounded-2xl border border-stone-700/80 bg-barber-dark/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden animate-fade-in-up [animation-fill-mode:forwards] [animation-duration:220ms]"
        >
          <div className="h-[3px] bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">App móvil</p>
                <h3 id="mobile-app-title" className="font-serif text-base text-white font-medium leading-snug mt-0.5">
                  {businessName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 h-7 w-7 rounded-lg border border-white/15 text-stone-400 hover:text-white hover:border-white/30 transition-colors"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed mb-3">
              Agenda citas y revisa tu historial desde el celular.
              {!androidUrl && driveUrl && ' Descarga Android por Google Drive mientras publicamos en Play Store.'}
            </p>

            <div className="flex flex-col gap-2">
              {(iosUrl || !hasAnyDownload) && <AppStoreBadge href={iosUrl} disabled={!iosUrl} compact />}
              {androidUrl ? (
                <GooglePlayBadge href={androidUrl} compact />
              ) : driveUrl ? (
                <GoogleDriveDownloadButton href={driveUrl} compact />
              ) : (
                <GooglePlayBadge disabled compact />
              )}
              {androidUrl && driveUrl && <GoogleDriveDownloadButton href={driveUrl} compact />}
              {apkUrl && <ApkDownloadButton href={apkUrl} compact />}
            </div>

            {!hasAnyDownload && (
              <p className="mt-2.5 text-[11px] text-stone-500 leading-snug">
                Próximamente en tiendas. Mientras tanto, usa la web.
              </p>
            )}
            {!androidUrl && driveUrl && (
              <p className="mt-2.5 text-[11px] text-stone-500 leading-snug">
                Al instalar el APK, Android puede pedirte permitir instalación desde esta fuente.
              </p>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="app-movil"
        className={`group inline-flex items-center gap-2 rounded-full border font-semibold text-sm shadow-[0_14px_32px_rgba(0,0,0,0.22)] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          open
            ? 'bg-barber-dark text-white border-barber-dark px-4 py-3'
            : 'bg-white text-barber-dark border-stone-200/80 px-3.5 py-3.5 sm:px-4 sm:py-3 hover:border-gold/50 hover:shadow-[0_16px_36px_rgba(201,162,39,0.25)]'
        }`}
        aria-label={open ? 'Cerrar descarga de app' : 'Descargar app móvil'}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold group-hover:bg-gold group-hover:text-barber-dark transition-colors">
          <PhoneIcon className="h-4 w-4" />
        </span>
        <span className={`hidden sm:inline ${open ? 'pr-0.5' : ''}`}>
          {open ? 'Cerrar' : 'App móvil'}
        </span>
      </button>
    </div>
  );
}
