/**
 * Línea de tiempo del historial de citas de un cliente.
 *
 * Nació dentro de `ClientDetailPage` (la ficha que ve el administrador) y se
 * promovió a `shared/` al necesitarla también el perfil del propio cliente
 * (`features/profile/pages/ProfilePage.jsx`): las dos pantallas muestran el
 * mismo historial y deben verse igual, así que el estilo vive en un solo
 * sitio en vez de duplicarse.
 *
 * Espera las filas tal como las devuelve la API de citas (`service_name`,
 * `appointment_date`, `start_time`, `barber_first_name`, ...), que es la
 * misma forma en `/clients/:id/history` y en `/appointments`.
 */

import { Calendar, Clock, Scissors, User } from 'lucide-react';
import {
  formatAppointmentCalendarDate,
  formatAppointmentClockTime,
  appointmentNotesOf,
} from '@/shared/utils/appointmentTime';

export const APPOINTMENT_STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

/** Colores del punto y del distintivo según el estado de la cita. */
function statusColors(status) {
  if (status === 'completed') {
    return { dot: 'bg-emerald-500', badge: 'bg-emerald-50/70 text-emerald-700 border-emerald-100' };
  }
  if (status === 'cancelled' || status === 'no_show') {
    return { dot: 'bg-rose-500', badge: 'bg-rose-50/70 text-rose-700 border-rose-100' };
  }
  if (status === 'scheduled' || status === 'confirmed') {
    return { dot: 'bg-amber-400', badge: 'bg-amber-50/70 text-amber-800 border-amber-200/50' };
  }
  return { dot: 'bg-stone-300', badge: 'bg-stone-50 text-stone-700 border-stone-200/60' };
}

export default function AppointmentHistoryTimeline({
  appointments = [],
  loading = false,
  total = null,
  emptyLabel = 'Sin citas registradas aún.',
  loadingLabel = 'Cargando historial...',
  /** Nota de la cita: el admin la necesita; al cliente no le dice nada útil. */
  showNotes = true,
  minHeightClass = 'min-h-[240px]',
}) {
  const count = total ?? appointments.length;

  if (loading && appointments.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${minHeightClass} py-10 text-center`}>
        <p className="text-sm font-medium text-stone-500">{loadingLabel}</p>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${minHeightClass} py-10 text-center`}>
        <Scissors className="mb-2 h-12 w-12 text-stone-200" aria-hidden />
        <p className="text-sm font-medium text-stone-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative ml-3.5 space-y-4 border-l-2 border-stone-100 pl-5 pr-2 transition-opacity duration-200 ${
        loading ? 'pointer-events-none opacity-60' : 'opacity-100'
      }`}
    >
      {appointments.map((item) => {
        const noteText = showNotes ? appointmentNotesOf(item) : '';
        const colors = statusColors(item.status);

        return (
          <div key={item.id} className="group relative">
            <span
              className={`absolute -left-[27px] top-1.5 z-10 h-3 w-3 rounded-full border-2 border-white shadow-sm transition-transform duration-350 group-hover:scale-125 ${colors.dot}`}
              aria-hidden
            />

            <div className="rounded-xl border border-stone-50 p-4 transition-all duration-200 hover:border-stone-100 hover:bg-stone-50/30">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="break-words text-sm font-bold text-stone-850 transition-colors duration-200 group-hover:text-gold-dark">
                    {item.service_name}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                      {formatAppointmentCalendarDate(item.appointment_date, 'es-CO', { year: 'numeric' })}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                      {formatAppointmentClockTime(item.start_time)}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                      {item.barber_first_name} {item.barber_last_name}
                    </span>
                  </div>

                  {noteText && (
                    <div className="mt-2.5 break-words rounded-r-lg border-l-2 border-amber-300 bg-amber-50/20 py-1.5 pl-3 pr-2.5 text-xs text-stone-600">
                      <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-amber-800">
                        Nota de cita:
                      </span>
                      {noteText}
                    </div>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}
                >
                  {APPOINTMENT_STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
