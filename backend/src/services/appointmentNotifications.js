/**
 * Notificaciones por correo cuando se crea una cita.
 *
 * Diseño "fire-and-forget": nunca bloquea la respuesta HTTP.
 * Los errores solo se registran en consola para no frenar el flujo del usuario.
 */

import prisma from '../lib/prisma.js';
import {
  sendAppointmentConfirmation,
  sendAppointmentBarberNotice,
} from '../lib/mailer.js';
import * as settingsService from './settings.service.js';

async function resolveBusinessName() {
  try {
    const settings = await settingsService.getSettings();
    return settings?.business_name?.trim() || 'Mr. Kutz';
  } catch (_) {
    return 'Mr. Kutz';
  }
}

async function resolveBarberEmail(barberId) {
  if (!barberId) return null;
  try {
    const barber = await prisma.barber.findUnique({
      where: { id: Number(barberId) },
      include: { user: { select: { email: true } } },
    });
    return barber?.user?.email || null;
  } catch (err) {
    console.warn('[appointmentNotifications] No se pudo obtener correo del barbero:', err?.message || err);
    return null;
  }
}

/**
 * Envía correos de confirmación al cliente y aviso al barbero.
 * Recibe la vista plana (snake_case) que devuelve appointment.service.getById().
 */
export async function notifyAppointmentCreated(appointment) {
  if (!appointment) return;

  const businessName = await resolveBusinessName();
  const tasks = [];

  if (appointment.client_email) {
    tasks.push(
      sendAppointmentConfirmation({
        to: appointment.client_email,
        appointment,
        businessName,
      })
        .then((r) => {
          if (!r?.sent) {
            console.warn(
              '[appointmentNotifications] Correo al cliente no enviado:',
              r?.reason || 'unknown'
            );
          }
        })
        .catch((err) =>
          console.error('[appointmentNotifications] cliente:', err?.message || err)
        )
    );
  }

  const barberEmail = await resolveBarberEmail(appointment.barber_id);
  if (barberEmail) {
    tasks.push(
      sendAppointmentBarberNotice({
        to: barberEmail,
        appointment,
        businessName,
      })
        .then((r) => {
          if (!r?.sent) {
            console.warn(
              '[appointmentNotifications] Correo al barbero no enviado:',
              r?.reason || 'unknown'
            );
          }
        })
        .catch((err) =>
          console.error('[appointmentNotifications] barbero:', err?.message || err)
        )
    );
  }

  // No esperamos a que terminen; si falla, solo queda log.
  Promise.allSettled(tasks);
}
