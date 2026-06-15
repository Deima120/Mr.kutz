import { formatAppointmentClockTime, appointmentNotesOf } from '@/shared/utils/appointmentTime';
import { AppointmentNoteEllipsis } from '@/shared/components/AppointmentNoteText';
import {
  AGENDA_LIST_DAY_NAMES,
  AGENDA_STATUS_STYLES,
} from '@/features/agenda/utils/agendaConstants';
import { isTodayISO, statusLabel } from '@/features/agenda/utils/agendaHelpers';

export default function AgendaListView({ appointmentsByDay, onSelectAppointment }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
      {Object.entries(appointmentsByDay).map(([dayStr, list]) => {
        const d = new Date(`${dayStr}T12:00:00`);
        const dayName = AGENDA_LIST_DAY_NAMES[d.getDay()];
        const today = isTodayISO(dayStr);
        const sorted = list
          .slice()
          .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

        return (
          <div
            key={dayStr}
            className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
              today ? 'border-gold/50 ring-1 ring-gold/20' : 'border-stone-200'
            }`}
          >
            <div className="px-4 py-3 border-b border-stone-100">
              <h3 className={`font-serif font-medium ${today ? 'text-gold' : 'text-stone-900'}`}>
                {dayName} {d.getDate()}
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {sorted.length} cita{sorted.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-4 min-h-[120px]">
              {sorted.length === 0 ? (
                <p className="text-stone-400 text-sm">Sin citas</p>
              ) : (
                <ul className="space-y-2">
                  {sorted.map((a) => {
                    const noteText = appointmentNotesOf(a);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => onSelectAppointment?.(a)}
                          className="w-full text-left text-sm border-l-2 border-gold/40 pl-2 py-1 rounded-r-lg hover:bg-stone-50 transition-colors"
                        >
                          <span className="font-semibold text-stone-900">
                            {formatAppointmentClockTime(a.start_time)}
                          </span>
                          <span className="text-stone-600">
                            {' '}
                            {a.client_first_name} {a.client_last_name}
                          </span>
                          <span className="block text-stone-500 truncate">{a.service_name}</span>
                          {noteText ? (
                            <span className="block text-stone-500 text-xs mt-0.5">
                              <span className="text-stone-600 font-medium">Nota: </span>
                              <AppointmentNoteEllipsis text={noteText} maxLength={48} />
                            </span>
                          ) : null}
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded-lg text-xs font-medium border ${
                              AGENDA_STATUS_STYLES[a.status] || 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {statusLabel(a.status)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
