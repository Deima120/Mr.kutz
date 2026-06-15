/**
 * Alerta flotante de éxito — se cierra sola tras unos segundos.
 */

import { useEffect } from 'react';

export default function SuccessToast({
  message,
  onDismiss,
  duration = 4000,
}) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timer);
  }, [message, onDismiss, duration]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-stone-900 border border-gold/45 text-white px-4.5 py-3.5 rounded-xl shadow-2xl animate-fade-in-up transition-all duration-300 max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div className="w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
        <span className="text-sm font-bold" aria-hidden>✓</span>
      </div>
      <p className="flex-1 text-xs sm:text-sm font-medium pr-6">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-stone-400 hover:text-gold transition-colors text-xs font-bold p-1"
        aria-label="Cerrar alerta"
      >
        ✕
      </button>
    </div>
  );
}
