/**
 * Botón de acción compacto con icono para tablas y listas admin.
 */

import { Link } from 'react-router-dom';

const VARIANTS = {
  default:
    'border-stone-200 bg-white text-stone-600 hover:border-gold/50 hover:bg-gold/5 hover:text-gold-dark',
  danger:
    'border-red-200/80 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700',
  primary:
    'border-barber-dark/20 bg-barber-dark text-white hover:bg-barber-charcoal hover:border-barber-charcoal',
};

export default function AdminIconButton({
  icon: Icon,
  label,
  title,
  onClick,
  to,
  variant = 'default',
  className = '',
  disabled = false,
  ...rest
}) {
  const aria = label || title;
  const baseClass = `inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-xl border shadow-sm transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant] || VARIANTS.default} ${className}`;

  if (to) {
    return (
      <Link to={to} className={baseClass} aria-label={aria} title={title || label} {...rest}>
        <Icon className="w-4 h-4" strokeWidth={2} aria-hidden />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClass}
      aria-label={aria}
      title={title || label}
      {...rest}
    >
      <Icon className="w-4 h-4" strokeWidth={2} aria-hidden />
    </button>
  );
}
