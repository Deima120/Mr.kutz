/**
 * Provider global de toasts. Usar useAppToast() desde cualquier pantalla.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AppToastHost from '@/shared/feedback/AppToastHost';
import {
  createToastId,
  dismissToast,
  getToastDuration,
  normalizeToastVariant,
  pushToast,
} from '@/shared/feedback/toastQueue';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((queue) => dismissToast(queue, id));
  }, []);

  const push = useCallback((message, options = {}) => {
    const text = String(message ?? '').trim();
    if (!text) return null;

    const variant = normalizeToastVariant(options.variant);
    const id = options.id || createToastId();
    const duration =
      typeof options.duration === 'number' ? options.duration : getToastDuration(variant);

    setToasts((queue) =>
      pushToast(queue, {
        id,
        message: text,
        variant,
        duration,
      })
    );
    return id;
  }, []);

  const api = useMemo(
    () => ({
      toast: push,
      success: (message, options) => push(message, { ...options, variant: 'success' }),
      error: (message, options) => push(message, { ...options, variant: 'error' }),
      warning: (message, options) => push(message, { ...options, variant: 'warning' }),
      info: (message, options) => push(message, { ...options, variant: 'info' }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <AppToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAppToast debe usarse dentro de ToastProvider');
  }
  return ctx;
}
