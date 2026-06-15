import { extractAppointmentDateYmd, getLocalDateToday } from '@/shared/utils/appointmentTime';
import { AGENDA_STATUS_LABELS } from '@/features/agenda/utils/agendaConstants';

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toLocalISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Lunes de la semana que contiene `dateStr` (YYYY-MM-DD). */
export function mondayOfWeek(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toLocalISODate(monday);
}

export function getWeekRange(weekStartISO) {
  const start = new Date(`${weekStartISO}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    dateFrom: toLocalISODate(start),
    dateTo: toLocalISODate(end),
  };
}

export function shiftWeek(weekStartISO, deltaDays) {
  const d = new Date(`${weekStartISO}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return toLocalISODate(d);
}

export function formatWeekRangeLabel(dateFrom, dateTo) {
  const from = new Date(`${dateFrom}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  const to = new Date(`${dateTo}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${from} – ${to}`;
}

export function groupAppointmentsByDay(appointments, weekStartISO) {
  const map = {};
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(`${weekStartISO}T12:00:00`);
    d.setDate(d.getDate() + i);
    map[toLocalISODate(d)] = [];
  }
  for (const appt of appointments) {
    const key = extractAppointmentDateYmd(appt.appointment_date);
    if (key && map[key]) map[key].push(appt);
  }
  return map;
}

export function summarizeWeek(appointments) {
  const total = appointments.length;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const pending = appointments.filter(
    (a) => !['completed', 'cancelled', 'no_show'].includes(a.status)
  ).length;
  const cancelled = appointments.filter((a) =>
    ['cancelled', 'no_show'].includes(a.status)
  ).length;
  return { total, completed, pending, cancelled };
}

export function statusLabel(status) {
  return AGENDA_STATUS_LABELS[status] || status;
}

export function isTodayISO(dateISO) {
  return dateISO === getLocalDateToday();
}
