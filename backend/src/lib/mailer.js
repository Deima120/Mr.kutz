/**
 * Envío de correos para recuperación de contraseña.
 *
 * - SMTP (Gmail, Brevo, etc.): puede entregar a cualquier dirección válida.
 * - Resend con dominio verificado: igual, a cualquier correo.
 * - Resend solo con onboarding@resend.dev: Resend limita destinatarios (cuenta de prueba).
 *   Si además tienes SMTP configurado, enviamos primero por SMTP para que llegue a cualquier usuario.
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

/** Al menos un método listo para enviar */
export function isMailDeliveryConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Nombre seguro para cabecera From */
function safeFromName(name) {
  return String(name || 'Mr. Kutz').replace(/["<>]/g, '').trim() || 'Mr. Kutz';
}

function buildResetContent(code, businessName) {
  const subject = `${businessName} — Código para restablecer contraseña`;
  const text = [
    `Hola,`,
    ``,
    `Tu código de recuperación es: ${code}`,
    ``,
    `Es válido por 30 minutos. Si no solicitaste restablecer la contraseña, ignora este mensaje.`,
    ``,
    `— ${businessName}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1c1917; line-height: 1.6; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #a8893d; margin-bottom: 8px;">${escapeHtml(businessName)}</p>
  <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 16px;">Restablecer contraseña</h1>
  <p>Usa este código en la página de recuperación:</p>
  <p style="font-size: 28px; font-weight: 600; letter-spacing: 0.25em; font-family: ui-monospace, monospace; color: #1c1917; background: #f5f5f4; padding: 16px 20px; border-radius: 12px; border: 1px solid #e7e5e4; text-align: center;">${escapeHtml(code)}</p>
  <p style="color: #57534e; font-size: 14px;">Válido por <strong>30 minutos</strong>. Si no fuiste tú, puedes ignorar este correo.</p>
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
  <p style="font-size: 12px; color: #a8a29e;">Mensaje automático, no respondas a este correo.</p>
</body>
</html>`.trim();

  return { subject, text, html };
}

/**
 * Resend solo envía con dominios que TÚ verificas en resend.com/domains.
 * No sirve poner @gmail.com como remitente → Resend lo rechaza.
 * En pruebas se usa onboarding@resend.dev (solo a destinatarios permitidos por tu cuenta).
 */
function resolveResendFrom(businessName) {
  const name = safeFromName(businessName);
  const fallback = `${name} <onboarding@resend.dev>`;
  const raw = process.env.RESEND_FROM?.trim();

  if (!raw) return fallback;

  const addr = raw.includes('<') ? (raw.match(/<([^>]+)>/)?.[1] || raw).trim().toLowerCase() : raw.toLowerCase();

  if (addr === 'onboarding@resend.dev') {
    return raw.includes('<') ? raw : `${name} <onboarding@resend.dev>`;
  }

  const isPublicInbox =
    /@(gmail|googlemail)\.com$|@(hotmail|outlook|live|msn)\.|@yahoo\.|@icloud\.|@proton\.(me|mail)$/i.test(
      addr
    );

  if (isPublicInbox) {
    console.warn(
      '[mailer] RESEND_FROM no puede ser @gmail u otro correo público en Resend. Usando onboarding@resend.dev (quita RESEND_FROM o usa un dominio verificado).'
    );
    return fallback;
  }

  if (raw.includes('<') && raw.includes('@')) return raw;
  if (raw.includes('@')) return `${name} <${raw}>`;
  return fallback;
}

async function sendViaResend({ to, code, businessName }) {
  const apiKey = process.env.RESEND_API_KEY.trim();
  const from = resolveResendFrom(businessName);
  const { subject, text, html } = buildResetContent(code, businessName);

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
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

async function sendViaSmtp({ to, code, businessName }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, reason: 'not_configured' };
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    `"${safeFromName(businessName)}" <${process.env.SMTP_USER.trim()}>`;
  const { subject, text, html } = buildResetContent(code, businessName);

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] SMTP:', err?.message || err);
    return { sent: false, reason: 'send_failed' };
  }
}

function isResendOnboardingSandbox(businessName) {
  if (!isResendConfigured()) return false;
  return resolveResendFrom(businessName).toLowerCase().includes('onboarding@resend.dev');
}

/**
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
export async function sendPasswordResetCode({ to, code, businessName = 'Mr. Kutz' }) {
  const smtpOk = isSmtpConfigured();
  const resendOk = isResendConfigured();

  // onboarding@resend.dev no permite enviar a cualquier bandeja; SMTP sí (p. ej. Gmail).
  if (smtpOk && resendOk && isResendOnboardingSandbox(businessName)) {
    console.warn(
      '[mailer] Resend en modo prueba (onboarding@resend.dev): usando SMTP primero para entregar a cualquier correo.'
    );
    const smtp = await sendViaSmtp({ to, code, businessName });
    if (smtp.sent) return smtp;
    console.warn('[mailer] SMTP falló; intentando Resend…');
    return sendViaResend({ to, code, businessName });
  }

  if (resendOk) {
    const r = await sendViaResend({ to, code, businessName });
    if (r.sent) return r;
    if (smtpOk) {
      console.warn('[mailer] Resend falló; intentando SMTP…');
      return sendViaSmtp({ to, code, businessName });
    }
    return r;
  }

  return sendViaSmtp({ to, code, businessName });
}
