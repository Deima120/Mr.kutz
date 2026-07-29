/**
 * Banner/alerta inline para avisos persistentes de contexto
 * (stock bajo, orden ya recibida, etc.). No usar para errores de campo.
 */

const VARIANT_CLASS = {
  success: 'app-alert app-alert-success',
  error: 'app-alert app-alert-error',
  warning: 'app-alert app-alert-warning',
  info: 'app-alert app-alert-info',
};

export default function AppInlineAlert({
  variant = 'info',
  title,
  children,
  className = '',
  role,
}) {
  const resolved = VARIANT_CLASS[variant] ? variant : 'info';
  const computedRole =
    role || (resolved === 'error' ? 'alert' : resolved === 'success' ? 'status' : 'status');

  return (
    <div className={`${VARIANT_CLASS[resolved]} ${className}`.trim()} role={computedRole}>
      {title ? <p className="font-semibold mb-1">{title}</p> : null}
      {typeof children === 'string' || typeof children === 'number' ? (
        <p className={title ? 'text-sm opacity-95' : undefined}>{children}</p>
      ) : (
        children
      )}
    </div>
  );
}
