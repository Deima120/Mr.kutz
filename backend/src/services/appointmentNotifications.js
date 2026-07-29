/**
 * Notificaciones por correo de citas.
 *
 * Diseño "fire-and-forget": nunca bloquea la respuesta HTTP.
 * Los errores solo se registran en consola para no frenar el flujo del usuario.
 */

import prisma from '../lib/prisma.js';
import {
  sendAppointmentConfirmation,
  sendAppointmentBarberNotice,
  sendAppointmentConfirmedToClient,
  sendAppointmentConfirmedToBarber,
  sendAppointmentCancelledToClient,
  sendAppointmentCancelledToBarber,
  sendAppointmentReviewRequest,
} from '../lib/mailer.js';
import * as settingsService from './settings.service.js';

function resolvePublicBaseUrl() {
  const raw =
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL;
  if (!raw) return null;
  return String(raw).trim().replace(/\/+$/, '');
}

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

function trackMail(label, promise) {
  return promise
    .then((r) => {
      if (!r?.sent) {
        console.warn(`[appointmentNotifications] ${label} no enviado:`, r?.reason || 'unknown');
      }
    })
    .catch((err) => console.error(`[appointmentNotifications] ${label}:`, err?.message || err));
}

async function notifyClientAndBarber(appointment, { clientSend, barberSend, clientLabel, barberLabel }) {
  if (!appointment) return;
  const businessName = await resolveBusinessName();
  const tasks = [];

  if (appointment.client_email && clientSend) {
    tasks.push(
      trackMail(
        clientLabel,
        clientSend({ to: appointment.client_email, appointment, businessName })
      )
    );
  }

  const barberEmail = await resolveBarberEmail(appointment.barber_id);
  if (barberEmail && barberSend) {
    tasks.push(
      trackMail(
        barberLabel,
        barberSend({ to: barberEmail, appointment, businessName })
      )
    );
  }

  Promise.allSettled(tasks);
}

/**
 * Cita creada: aviso al cliente + barbero.
 */
export async function notifyAppointmentCreated(appointment) {
  return notifyClientAndBarber(appointment, {
    clientSend: sendAppointmentConfirmation,
    barberSend: sendAppointmentBarberNotice,
    clientLabel: 'Correo al cliente (agendada)',
    barberLabel: 'Correo al barbero (nueva cita)',
  });
}

/**
 * Cita confirmada por el negocio.
 */
export async function notifyAppointmentConfirmed(appointment) {
  return notifyClientAndBarber(appointment, {
    clientSend: sendAppointmentConfirmedToClient,
    barberSend: sendAppointmentConfirmedToBarber,
    clientLabel: 'Correo al cliente (confirmada)',
    barberLabel: 'Correo al barbero (confirmada)',
  });
}

/**
 * Cita cancelada (incluye cancel_reason en plantilla).
 */
export async function notifyAppointmentCancelled(appointment) {
  return notifyClientAndBarber(appointment, {
    clientSend: sendAppointmentCancelledToClient,
    barberSend: sendAppointmentCancelledToBarber,
    clientLabel: 'Correo al cliente (cancelada)',
    barberLabel: 'Correo al barbero (cancelada)',
  });
}

/**
 * Invita al cliente a dejar reseña cuando la cita pasa a completada.
 */
export async function notifyAppointmentCompleted(appointment) {
  if (!appointment || !appointment.client_email) return;
  const businessName = await resolveBusinessName();
  const base = resolvePublicBaseUrl();
  const reviewUrl = base ? `${base}/appointments` : undefined;

  trackMail(
    'Correo de valoración',
    sendAppointmentReviewRequest({
      to: appointment.client_email,
      appointment,
      businessName,
      reviewUrl,
    })
  );
}
