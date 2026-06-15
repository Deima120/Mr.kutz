import { X } from 'lucide-react';
import { formatAppointmentCalendarDate, formatAppointmentClockTime, appointmentNotesOf } from '@/shared/utils/appointmentTime';
import { AppointmentNoteBlock } from '@/shared/components/AppointmentNoteText';
import { AGENDA_STATUS_STYLES } from '@/features/agenda/utils/agendaConstants';
import { statusLabel } from '@/features/agenda/utils/agendaHelpers';

export default function AgendaDetailModal({ appointment, loading, onClose }) {
  if (!appointment && !loading) return null;

  const noteText = appointment ? appointmentNotesOf(appointment) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm"
      onClick={() => !loading && onClose?.()}
    >
      <div
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-detail-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="agenda-detail-title" className="font-serif text-lg font-semibold text-stone-900">
            Detalle de cita
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-stone-500 text-sm">Cargando detalle…</div>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Estado</p>
              <span
                className={`inline-flex mt-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  AGENDA_STATUS_STYLES[appointment.status] || 'bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                {statusLabel(appointment.status)}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Fecha y hora</p>
              <p className="text-stone-900 font-medium mt-0.5">
                {formatAppointmentCalendarDate(appointment.appointment_date, 'es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-stone-600">
                {formatAppointmentClockTime(appointment.start_time)}
                {appointment.end_time
                  ? ` – ${formatAppointmentClockTime(appointment.end_time)}`
                  : ''}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Cliente</p>
              <p className="text-stone-900 mt-0.5">
                {appointment.client_first_name} {appointment.client_last_name}
              </p>
              {appointment.client_phone ? (
                <p className="text-stone-600 text-xs mt-0.5">{appointment.client_phone}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Servicio</p>
              <p className="text-stone-900 mt-0.5">{appointment.service_name}</p>
              {appointment.duration_minutes ? (
                <p className="text-stone-500 text-xs mt-0.5">
                  Duración: {appointment.duration_minutes} min
                </p>
              ) : null}
            </div>
            {noteText ? (
              <div>
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Notas</p>
                <AppointmentNoteBlock
                  text={noteText}
                  className="text-stone-600 text-sm pl-3 border-l-2 border-gold/35"
                />
              </div>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="w-full py-2.5 text-stone-600 hover:text-stone-900 text-sm font-medium"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
