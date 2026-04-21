import * as appointmentService from '../services/appointment.service.js';
import * as publicBookingService from '../services/publicBooking.service.js';

export const listBarbers = async (req, res, next) => {
  try {
    const data = await publicBookingService.listPublicBarbers();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listServices = async (req, res, next) => {
  try {
    const data = await publicBookingService.listPublicServices();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSlots = async (req, res, next) => {
  try {
    const { barberId, date } = req.query;
    if (!barberId || !date) {
      return res
        .status(400)
        .json({ success: false, message: 'Se requieren barbero y fecha.' });
    }
    const slots = await appointmentService.getAvailableSlots(barberId, date);
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const appointment = await publicBookingService.createPublicBooking(req.body);
    res.status(201).json({
      success: true,
      message: 'Tu cita quedó registrada. Te enviamos la confirmación por correo.',
      data: {
        id: appointment.id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        service_name: appointment.service_name,
        barber_first_name: appointment.barber_first_name,
        barber_last_name: appointment.barber_last_name,
      },
    });
  } catch (err) {
    next(err);
  }
};
