/**
 * Estado compartido para validación de formularios sin validador HTML5.
 * Incluye hints en tiempo real (borde verde/rojo + mensaje bajo el campo).
 */

import { useCallback, useState } from 'react';

export function isFieldActive(touched, name, value) {
  return Boolean(touched[name] || String(value ?? '').length > 0);
}

export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState({});

  const clearValidation = useCallback(() => {
    setFieldErrors({});
    setShowErrors(false);
    setTouched({});
  }, []);

  const markTouched = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const markAllTouched = useCallback((names) => {
    setTouched((prev) => {
      const next = { ...prev };
      names.forEach((name) => {
        next[name] = true;
      });
      return next;
    });
  }, []);

  const isFieldActiveFn = useCallback(
    (name, value) => isFieldActive(touched, name, value),
    [touched]
  );

  const applyValidation = useCallback((result) => {
    if (!result.valid) {
      setFieldErrors(result.errors);
      setShowErrors(true);
      setTouched((prev) => {
        const next = { ...prev };
        Object.keys(result.errors).forEach((key) => {
          next[key] = true;
          const base = key.split('.')[0];
          next[base] = true;
        });
        return next;
      });
      return false;
    }
    setFieldErrors({});
    setShowErrors(false);
    return true;
  }, []);

  const fieldError = useCallback(
    (name) => (showErrors && fieldErrors[name] ? fieldErrors[name] : ''),
    [showErrors, fieldErrors]
  );

  const clearFieldError = useCallback((name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const inputInvalidClass =
    '!border-red-400 focus:!ring-red-200/50 focus:!border-red-400';

  const fieldBorderClass = useCallback(
    (name, valid, value) => {
      if (fieldError(name)) return inputInvalidClass;
      if (isFieldActive(touched, name, value)) {
        return valid ? '!border-emerald-500' : '!border-red-400';
      }
      return '';
    },
    [fieldError, touched]
  );

  /** @deprecated Usa fieldBorderClass */
  const inputStateClass = fieldBorderClass;

  const buildLiveHint = useCallback(
    (name, value, validation, successMessage = 'Correcto.') => ({
      show: isFieldActive(touched, name, value),
      valid: validation.valid,
      message: validation.message,
      successMessage,
    }),
    [touched]
  );

  return {
    fieldErrors,
    showErrors,
    touched,
    fieldError,
    fieldBorderClass,
    inputStateClass,
    inputInvalidClass,
    applyValidation,
    clearValidation,
    clearFieldError,
    markTouched,
    markAllTouched,
    isFieldActive: isFieldActiveFn,
    buildLiveHint,
    setFieldErrors,
    setShowErrors,
  };
}
