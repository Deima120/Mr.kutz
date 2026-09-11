/**
 * Tarjeta de estadística — diseño premium (gold, stone)
 */

export default function StatsCard({
  label,
  value,
  sublabel,
  variant = 'default',
  href,
  emphasizeValue = false,
  /** 'danger' tiñe la cifra cuando el dato exige atención (p. ej. stock bajo). */
  tone = 'default',
}) {
  const variants = {
    default: 'bg-white border-stone-200/80 text-stone-900 shadow-card hover:shadow-card-hover hover:border-gold/20',
    primary: 'bg-barber-dark border-barber-dark text-white shadow-card',
  };

  const valueTone =
    variant === 'primary'
      ? 'text-white'
      : tone === 'danger'
      ? 'text-rose-600'
      : 'text-stone-900';

  const valueClass = emphasizeValue
    ? `font-serif font-medium mt-2 ${valueTone} text-3xl md:text-4xl lg:text-[2.75rem] leading-none tracking-tight`
    : `font-serif text-2xl md:text-3xl font-medium mt-2 ${valueTone}`;

  const content = (
    <div className={`rounded-2xl border p-6 transition-all duration-300 ${variants[variant] || variants.default}`}>
      {/* Versalitas, igual que los encabezados de tabla y las etiquetas de
          filtro: las tres cosas rotulan un dato y deben verse iguales. */}
      <p
        className={`text-xs font-semibold uppercase tracking-[0.1em] ${
          variant === 'primary' ? 'text-gold' : 'text-stone-500'
        }`}
      >
        {label}
      </p>
      <p className={valueClass}>{value}</p>
      {/* `div` y no `p`: el sublabel puede traer un botón o enlace (en Inventario
          lleva el acceso directo a las alertas de stock). */}
      {sublabel && (
        <div className={`mt-1 text-sm ${variant === 'primary' ? 'text-stone-400' : 'text-stone-500'}`}>
          {sublabel}
        </div>
      )}
    </div>
  );

  if (href) {
    return <a href={href} className="block hover:opacity-95 transition-opacity">{content}</a>;
  }
  return content;
}
