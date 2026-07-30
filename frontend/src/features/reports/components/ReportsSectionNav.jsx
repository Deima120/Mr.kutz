import { REPORT_SECTIONS } from '@/features/reports/reportsNav';

export default function ReportsSectionNav({ activeId, onChange }) {
  return (
    <nav
      className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5"
      aria-label="Secciones de reportes"
    >
      {REPORT_SECTIONS.map((section) => {
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
              active
                ? 'border-gold/60 bg-gold/10 text-stone-900 shadow-sm'
                : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
            }`}
          >
            <span className="block text-xs font-semibold leading-tight">{section.label}</span>
            <span className="mt-0.5 block text-[10px] text-stone-500 leading-tight">
              {section.description}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
