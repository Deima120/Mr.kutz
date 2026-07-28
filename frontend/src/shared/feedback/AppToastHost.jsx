/**
 * Host visual de toasts (variantes success / error / warning / info).
 */

import { useEffect } from 'react';
import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';

const VARIANT_UI = {
  success: {
    shell: 'bg-stone-900 border-gold/45 text-white',
    iconWrap: 'bg-gold/15 text-gold',
    Icon: Check,
    live: 'polite',
    role: 'status',
  },
  error: {
    shell: 'bg-stone-900 border-red-400/50 text-white',
    iconWrap: 'bg-red-500/20 text-red-300',
    Icon: CircleAlert,
    live: 'assertive',
    role: 'alert',
  },
  warning: {
    shell: 'bg-stone-900 border-amber-400/50 text-white',
    iconWrap: 'bg-amber-500/20 text-amber-300',
    Icon: TriangleAlert,
    live: 'polite',
    role: 'status',
  },
  info: {
    shell: 'bg-stone-900 border-sky-400/40 text-white',
    iconWrap: 'bg-sky-500/20 text-sky-300',
    Icon: Info,
    live: 'polite',
    role: 'status',
  },
};

function ToastItem({ toast, onDismiss }) {
  const ui = VARIANT_UI[toast.variant] || VARIANT_UI.success;
  const Icon = ui.Icon;

  useEffect(() => {
    if (!toast?.id || !toast.duration) return undefined;
    const timer = setTimeout(() => onDismiss?.(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast?.id, toast?.duration, onDismiss]);

  return (
    <div
      className={`pointer-events-auto relative flex items-center gap-3 border px-4.5 py-3.5 rounded-xl shadow-2xl animate-fade-in-up max-w-sm ${ui.shell}`}
      role={ui.role}
      aria-live={ui.live}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${ui.iconWrap}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
      </div>
      <p className="flex-1 text-xs sm:text-sm font-medium pr-6">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss?.(toast.id)}
        className="absolute top-2.5 right-2.5 text-stone-400 hover:text-gold transition-colors p-1"
        aria-label="Cerrar aviso"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** Lista flotante abajo-derecha; flex-col-reverse pone el más reciente arriba. */
export default function AppToastHost({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[190] flex flex-col-reverse gap-2 pointer-events-none"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
