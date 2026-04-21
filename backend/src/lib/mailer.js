/**
 * Envío de correos transaccionales (Mr. Kutz).
 *
 * Estrategia de entrega:
 * - SMTP (Gmail, Brevo, etc.): puede entregar a cualquier dirección válida.
 * - Resend con dominio verificado: igual, a cualquier correo.
 * - Resend solo con onboarding@resend.dev: sandbox, restringe destinatarios.
 *   Si hay SMTP configurado, se intenta SMTP primero para mayor entrega.
 */

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export function isMailDeliveryConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeFromName(name) {
  return String(name || 'Mr. Kutz').replace(/["<>]/g, '').trim() || 'Mr. Kutz';
}

function resolveResendFrom(businessName) {
  const name = safeFromName(businessName);
  const fallback = `${name} <onboarding@resend.dev>`;
  const raw = process.env.RESEND_FROM?.trim();

  if (!raw) return fallback;

  const addr = raw.includes('<')
    ? (raw.match(/<([^>]+)>/)?.[1] || raw).trim().toLowerCase()
    : raw.toLowerCase();

  if (addr === 'onboarding@resend.dev') {
    return raw.includes('<') ? raw : `${name} <onboarding@resend.dev>`;
  }

  const isPublicInbox =
    /@(gmail|googlemail)\.com$|@(hotmail|outlook|live|msn)\.|@yahoo\.|@icloud\.|@proton\.(me|mail)$/i.test(
      addr
    );

  if (isPublicInbox) {
    console.warn(
      '[mailer] RESEND_FROM no puede ser un correo público en Resend. Usando onboarding@resend.dev.'
    );
    return fallback;
  }

  if (raw.includes('<') && raw.includes('@')) return raw;
  if (raw.includes('@')) return `${name} <${raw}>`;
  return fallback;
}

function isResendOnboardingSandbox(businessName) {
  if (!isResendConfigured()) return false;
  return resolveResendFrom(businessName).toLowerCase().includes('onboarding@resend.dev');
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendViaResend({ to, subject, text, html, businessName }) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY.trim());
    const result = await resend.emails.send({
      from: resolveResendFrom(businessName),
      to,
      subject,
      text,
      html,
    });
    if (result.error) {
      console.error('[mailer] Resend:', result.error.message || result.error);
      return { sent: false, reason: 'send_failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Resend (excepción):', err?.message || err);
    return { sent: false, reason: 'send_failed' };
  }
}

async function sendViaSmtp({ to, subject, text, html, businessName }) {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: 'not_configured' };

  const from =
    process.env.SMTP_FROM?.trim() ||
    `"${safeFromName(businessName)}" <${process.env.SMTP_USER.trim()}>`;

  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    const detail = err?.response ?? err?.message ?? String(err);
    console.error('[mailer] SMTP error:', detail);
    if (err?.responseCode) {
      console.error('[mailer] SMTP código:', err.responseCode, err.code || '');
    }
    return { sent: false, reason: 'send_failed', smtpError: detail };
  }
}

/**
 * Helper genérico: elige SMTP o Resend según configuración.
 */
async function sendMail({ to, subject, text, html, businessName = 'Mr. Kutz' }) {
  if (!to) return { sent: false, reason: 'no_recipient' };

  const smtpOk = isSmtpConfigured();
  const resendOk = isResendConfigured();

  if (!smtpOk && !resendOk) {
    console.warn('[mailer] No hay configuración de correo (SMTP ni Resend).');
    return { sent: false, reason: 'not_configured' };
  }

  const payload = { to, subject, text, html, businessName };

  if (smtpOk && resendOk && isResendOnboardingSandbox(businessName)) {
    const smtp = await sendViaSmtp(payload);
    if (smtp.sent) return smtp;
    return sendViaResend(payload);
  }

  if (resendOk) {
    const r = await sendViaResend(payload);
    if (r.sent) return r;
    if (smtpOk) return sendViaSmtp(payload);
    return r;
  }

  return sendViaSmtp(payload);
}

// -------------------- Plantillas --------------------

function shell({ businessName, title, intro, highlightHtml, closing }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1c1917; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 12px; letter-spacing: 0.06em; color: #a8893d; margin-bottom: 8px;">${escapeHtml(businessName)}</p>
  <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 16px;">${escapeHtml(title)}</h1>
  ${intro ? `<p>${intro}</p>` : ''}
  ${highlightHtml || ''}
  ${closing ? `<p style="color: #57534e; font-size: 14px;">${closing}</p>` : ''}
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
  <p style="font-size: 12px; color: #a8a29e;">Mensaje automático, no respondas a este correo.</p>
</body>
</html>`.trim();
}

function buildResetContent(code, businessName) {
  return {
    subject: `${businessName} — Código para restablecer contraseña`,
    text: [
      'Hola,',
      '',
      `Tu código de recuperación es: ${code}`,
      '',
      'Es válido por 30 minutos. Si no solicitaste restablecer la contraseña, ignora este mensaje.',
      '',
      `— ${businessName}`,
    ].join('\n'),
    html: shell({
      businessName,
      title: 'Restablecer contraseña',
      intro: 'Usa este código en la página de recuperación:',
      highlightHtml: `<p style="font-size: 28px; font-weight: 600; letter-spacing: 0.25em; font-family: ui-monospace, monospace; color: #1c1917; background: #f5f5f4; padding: 16px 20px; border-radius: 12px; border: 1px solid #e7e5e4; text-align: center;">${escapeHtml(
        code
      )}</p>`,
      closing:
        'Válido por <strong>30 minutos</strong>. Si no fuiste tú, puedes ignorar este correo.',
    }),
  };
}

function formatAppointmentDate(appointment) {
  const d = appointment?.appointment_date
    ? new Date(appointment.appointment_date)
    : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (_) {
    return d.toISOString().slice(0, 10);
  }
}

function formatHHMM(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.match(/^(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : value;
  }
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  return String(value);
}

function appointmentDetailsHtml(appointment) {
  const rows = [
    ['Servicio', appointment.service_name],
    ['Barbero', `${appointment.barber_first_name || ''} ${appointment.barber_last_name || ''}`.trim()],
    ['Fecha', formatAppointmentDate(appointment)],
    ['Hora', formatHHMM(appointment.start_time)],
    appointment.notes ? ['Notas', appointment.notes] : null,
  ].filter(Boolean);

  const items = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding: 6px 10px; color: #78716c; font-size: 13px;">${escapeHtml(k)}</td>
        <td style="padding: 6px 10px; color: #1c1917; font-weight: 500;">${escapeHtml(v)}</td>
      </tr>`
    )
    .join('');

  return `
    <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f5f5f4; border-radius: 12px; border: 1px solid #e7e5e4; margin: 16px 0;">
      <tbody>${items}</tbody>
    </table>`;
}

function buildAppointmentClientContent(appointment, businessName) {
  const clientName =
    `${appointment.client_first_name || ''} ${appointment.client_last_name || ''}`.trim() ||
    'cliente';
  const date = formatAppointmentDate(appointment);
  const hour = formatHHMM(appointment.start_time);
  return {
    subject: `${businessName} — Cita confirmada para el ${date}`,
    text: [
      `Hola ${clientName},`,
      '',
      `Tu cita quedó confirmada.`,
      `• Servicio: ${appointment.service_name}`,
      `• Barbero: ${appointment.barber_first_name || ''} ${appointment.barber_last_name || ''}`.trim(),
      `• Fecha: ${date}`,
      `• Hora: ${hour}`,
      '',
      'Si necesitas cambiar o cancelar, responde por aquí o contáctanos.',
      '',
      `— ${businessName}`,
    ].join('\n'),
    html: shell({
      businessName,
      title: 'Cita confirmada',
      intro: `Hola <strong>${escapeHtml(clientName)}</strong>, tu cita quedó confirmada.`,
      highlightHtml: appointmentDetailsHtml(appointment),
      closing:
        'Si necesitas cambiar o cancelar, contáctanos con antelación. ¡Te esperamos!',
    }),
  };
}

function buildAppointmentBarberContent(appointment, businessName) {
  const barberName =
    `${appointment.barber_first_name || ''} ${appointment.barber_last_name || ''}`.trim() ||
    'barbero';
  const clientName =
    `${appointment.client_first_name || ''} ${appointment.client_last_name || ''}`.trim() ||
    'Cliente';
  const date = formatAppointmentDate(appointment);
  const hour = formatHHMM(appointment.start_time);
  return {
    subject: `${businessName} — Nueva cita asignada (${date} ${hour})`,
    text: [
      `Hola ${barberName},`,
      '',
      `Tienes una nueva cita en tu agenda.`,
      `• Cliente: ${clientName}`,
      `• Servicio: ${appointment.service_name}`,
      `• Fecha: ${date}`,
      `• Hora: ${hour}`,
      '',
      `— ${businessName}`,
    ].join('\n'),
    html: shell({
      businessName,
      title: 'Nueva cita en tu agenda',
      intro: `Hola <strong>${escapeHtml(barberName)}</strong>, tienes una nueva cita:`,
      highlightHtml: appointmentDetailsHtml({
        ...appointment,
        notes: appointment.notes
          ? `Cliente: ${clientName}. ${appointment.notes}`
          : `Cliente: ${clientName}`,
      }),
      closing: 'Revisa tu agenda para más detalles.',
    }),
  };
}

// -------------------- API pública --------------------

export async function sendPasswordResetCode({ to, code, businessName = 'Mr. Kutz' }) {
  const { subject, text, html } = buildResetContent(code, businessName);
  return sendMail({ to, subject, text, html, businessName });
}

/**
 * Envía al cliente confirmación de cita creada.
 * @param {{ to: string, appointment: object, businessName?: string }} params
 */
export async function sendAppointmentConfirmation({
  to,
  appointment,
  businessName = 'Mr. Kutz',
}) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  const { subject, text, html } = buildAppointmentClientContent(appointment, businessName);
  return sendMail({ to, subject, text, html, businessName });
}

/**
 * Notifica al barbero que se le asignó una cita nueva.
 * @param {{ to: string, appointment: object, businessName?: string }} params
 */
export async function sendAppointmentBarberNotice({
  to,
  appointment,
  businessName = 'Mr. Kutz',
}) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  const { subject, text, html } = buildAppointmentBarberContent(appointment, businessName);
  return sendMail({ to, subject, text, html, businessName });
}
