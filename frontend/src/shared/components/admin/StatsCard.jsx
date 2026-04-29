/**
 * Tarjeta de estadística — diseño premium (gold, stone)
 */

export default function StatsCard({ label, value, sublabel, variant = 'default', href }) {
  const variants = {
    default: 'bg-white border-stone-200/80 text-stone-900 shadow-card hover:shadow-card-hover hover:border-gold/20',
    primary: 'bg-barber-dark border-barber-dark text-white shadow-card',
  };

  const content = (
    <div className={`rounded-2xl border p-6 transition-all duration-300 ${variants[variant] || variants.default}`}>
      <p className={`text-xs font-semibold tracking-wider ${variant === 'primary' ? 'text-gold' : 'text-stone-500'}`}>
        {label}
      </p>
      <p className={`font-serif text-2xl md:text-3xl font-medium mt-2 ${variant === 'primary' ? 'text-white' : 'text-stone-900'}`}>
        {value}
      </p>
      {sublabel && (
        <p className={`text-sm mt-1 ${variant === 'primary' ? 'text-stone-400' : 'text-stone-500'}`}>
          {sublabel}
        </p>
      )}
    </div>
  );

  if (href) {
    return <a href={href} className="block hover:opacity-95 transition-opacity">{content}</a>;
  }
  return content;
}
