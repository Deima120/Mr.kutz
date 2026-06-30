/**
 * Indicadores visuales de validación en tiempo real (registro, clientes, admin, público).
 */

import { Check, X } from 'lucide-react';
import { ADMIN_FORM_LABEL_CLASS } from '@/shared/components/admin/AdminFormShell';

export function RequiredMark() {
  return <span className="text-red-600 normal-case"> *</span>;
}

export function FieldErrorMessage({ message, id }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-[11px] text-red-600 flex items-start gap-1" role="alert">
      <X className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

/** Campo admin con label, error al enviar e hint en tiempo real. */
export function AdminFormField({
  label,
  htmlFor,
  required = false,
  error = '',
  live = null,
  className = '',
  children,
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const showLive = Boolean(live?.show && !error);
  const liveInvalid = showLive && !live.valid;
  const submitInvalid = Boolean(error);

  return (
    <div className={`group shrink-0 ${className}`}>
      <label htmlFor={htmlFor} className={ADMIN_FORM_LABEL_CLASS}>
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {typeof children === 'function'
        ? children({
            error,
            invalid: submitInvalid || liveInvalid,
            errorId,
            hintId,
            liveBorderClass: showLive ? adminFieldStateClass(live.valid, true) : '',
            submitBorderClass: submitInvalid ? '!border-red-400 focus:!ring-red-200/50 focus:!border-red-400' : '',
          })
        : children}
      {submitInvalid ? <FieldErrorMessage message={error} id={errorId} /> : null}
      {showLive ? (
        <FieldHint
          valid={live.valid}
          touched
          message={live.message}
          successMessage={live.successMessage}
        />
      ) : null}
    </div>
  );
}

/** Campo público (auth, booking) con label-premium e hint en tiempo real. */
export function PublicFormField({
  label,
  htmlFor,
  required = false,
  error = '',
  live = null,
  className = '',
  children,
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const showLive = Boolean(live?.show && !error);
  const liveInvalid = showLive && !live.valid;
  const submitInvalid = Boolean(error);

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label-premium">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {typeof children === 'function'
        ? children({
            error,
            invalid: submitInvalid || liveInvalid,
            errorId,
            liveBorderClass: showLive ? adminFieldStateClass(live.valid, true) : '',
            submitBorderClass: submitInvalid ? '!border-red-400 focus:!ring-red-200/50 focus:!border-red-400' : '',
          })
        : children}
      {submitInvalid ? <FieldErrorMessage message={error} id={errorId} /> : null}
      {showLive ? (
        <FieldHint
          valid={live.valid}
          touched
          message={live.message}
          successMessage={live.successMessage}
        />
      ) : null}
    </div>
  );
}

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
  if (!touched) return null;
  if (valid) {
    if (!successMessage) return null;
    return (
      <p className="mt-1 text-[11px] flex items-center gap-1 text-emerald-700" role="status">
        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {successMessage}
      </p>
    );
  }
  if (!message) return null;
  return (
    <p
      className="mt-1 text-[11px] flex items-center gap-1 text-red-600"
      role="status"
    >
      <X className="w-3.5 h-3.5 shrink-0" aria-hidden />
      {message}
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
