import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWeekRangeLabel } from '@/features/agenda/utils/agendaHelpers';

export default function AgendaWeekToolbar({
  dateFrom,
  dateTo,
  view,
  onViewChange,
  onPrevWeek,
  onNextWeek,
  onToday,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
          Anterior
        </button>
        <button
          type="button"
          onClick={onToday}
          className="px-3 py-2 rounded-xl border border-stone-300 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Hoy
        </button>
        <span className="text-sm text-stone-600 min-w-[12rem] text-center font-medium">
          {formatWeekRangeLabel(dateFrom, dateTo)}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Siguiente
          <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div
        className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-sm"
        role="tablist"
        aria-label="Vista de agenda"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === 'week'}
          onClick={() => onViewChange('week')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            view === 'week' ? 'bg-barber-dark text-white' : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          Calendario
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          onClick={() => onViewChange('list')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            view === 'list' ? 'bg-barber-dark text-white' : 'text-stone-600 hover:bg-stone-50'
          }`}
        >
          Lista
        </button>
      </div>
    </div>
  );
}
