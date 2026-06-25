/**
 * Indicadores visuales de validación en tiempo real (registro, clientes, etc.)
 */

import { Check, X } from 'lucide-react';

export function inputStateClass(valid, touched) {
  if (!touched) return 'border-stone-300';
  return valid ? 'border-emerald-500' : 'border-red-400';
}

export function adminFieldStateClass(valid, show) {
  if (!show) return '';
  return valid ? '!border-emerald-500' : '!border-red-400';
}

export function emailBorderClass(formatValid, availability, show) {
  if (!show) return 'border-stone-300';
  if (!formatValid || availability === 'taken') return 'border-red-400';
  if (availability === 'available') return 'border-emerald-500';
  return 'border-stone-300';
}

export function adminEmailBorderClass(formatValid, availability, show) {
  if (!show) return '';
  if (!formatValid || availability === 'taken') return '!border-red-400';
  if (availability === 'available') return '!border-emerald-500';
  return '';
}

export function FieldHint({ valid, touched, message, successMessage }) {
  if (!touched || !message) return null;
  return (
    <p
      className={`mt-1 text-[11px] flex items-center gap-1 ${valid ? 'text-emerald-700' : 'text-red-600'}`}
      role="status"
    >
      {valid ? (
        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
      ) : (
        <X className="w-3.5 h-3.5 shrink-0" aria-hidden />
      )}
      {valid && successMessage ? successMessage : message}
    </p>
  );
}

export function EmailAvailabilityHint({ formatValid, availability, show }) {
  if (!show || !formatValid) return null;

  if (availability === 'checking') {
    return (
      <p className="mt-1 text-[11px] text-stone-500" role="status" aria-live="polite">
        Comprobando disponibilidad del correo…
      </p>
    );
  }

  if (availability === 'taken') {
    return <FieldHint valid={false} touched message="Este correo electrónico ya está registrado." />;
  }

  if (availability === 'available') {
    return <FieldHint valid touched message="" successMessage="Correo disponible." />;
  }

  if (availability === 'error') {
    return (
      <FieldHint
        valid={false}
        touched
        message="No se pudo comprobar el correo. Intenta de nuevo."
      />
    );
  }

  return null;
}
