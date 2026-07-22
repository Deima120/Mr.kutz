/**
 * Modal admin compartido: portal, Escape, bloqueo de fondo y foco inicial.
 */

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

function getFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
}

export default function AdminModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  zIndexClass = 'z-50',
  closeOnBackdrop = true,
  showClose = true,
  panelClassName = '',
  bodyClassName = '',
  labelledBy,
  preventClose = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = requestAnimationFrame(() => {
      const focusables = getFocusable(panelRef.current);
      const preferred =
        panelRef.current?.querySelector('[data-autofocus]') ||
        focusables.find((el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ||
        focusables[0];
      preferred?.focus?.();
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!preventClose) {
          event.preventDefault();
          onClose?.();
        }
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = getFocusable(panelRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, preventClose]);

  if (!open || typeof document === 'undefined') return null;

  const headingId = labelledBy || titleId;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm`}
      role="presentation"
      onMouseDown={(event) => {
        if (!closeOnBackdrop || preventClose) return;
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingId : undefined}
        className={`bg-white rounded-2xl border border-stone-200 shadow-2xl w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} max-h-[min(90vh,720px)] overflow-hidden flex flex-col ${panelClassName}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50/80 shrink-0">
            <div className="min-w-0">
              {title ? (
                <h2 id={headingId} className="font-serif text-lg font-semibold text-stone-900 truncate">
                  {title}
                </h2>
              ) : null}
              {subtitle ? <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p> : null}
            </div>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                disabled={preventClose}
                className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40 shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}

        <div className={`px-5 py-4 overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>{children}</div>

        {footer ? (
          <div className="px-5 py-4 border-t border-stone-200/80 shrink-0 bg-white">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
