/**
 * Encabezado de página — diseño premium alineado con HomePage
 */

export default function PageHeader({ title, actions, subtitle, label }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {label && (
            <p className="section-label text-gold mb-1">{label}</p>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-stone-500 text-sm">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
