/**
 * Card contenedor — diseño premium (landing-card)
 */

export default function DataCard({ title, actions, children, className = '', compact }) {
  const headerPad = compact ? 'px-4 py-2.5' : 'px-6 py-4';
  const titleCls = compact ? 'font-serif text-base font-medium text-stone-900' : 'font-serif text-lg font-medium text-stone-900';
  const bodyPad = compact ? 'p-3 sm:p-4' : 'p-6';
  return (
    <div className={`landing-card overflow-hidden${className ? ' ' + className : ''}`}>
      {(title || actions) && (
        <div className={`${headerPad} border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50`}>
          {title && <h3 className={titleCls}>{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyPad}>{children}</div>
    </div>
  );
}
