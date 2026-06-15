import * as appointmentService from '@/features/appointments/services/appointmentService';
import { AGENDA_WEEK_LIMIT } from '@/features/agenda/utils/agendaConstants';

export async function getWeekAppointments({ dateFrom, dateTo, barberId }) {
  return appointmentService.getAppointments({
    dateFrom,
    dateTo,
    barberId,
    limit: AGENDA_WEEK_LIMIT,
    offset: 0,
  });
}

export async function getAppointmentDetail(id) {
  return appointmentService.getAppointmentById(id);
}
