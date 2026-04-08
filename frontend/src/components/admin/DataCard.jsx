/**
 * Card contenedor — diseño premium (landing-card)
 */

export default function DataCard({ title, actions, children, className = '' }) {
  return (
    <div className={`landing-card overflow-hidden${className ? ' ' + className : ''}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50">
          {title && <h3 className="font-serif text-lg font-medium text-stone-900">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
