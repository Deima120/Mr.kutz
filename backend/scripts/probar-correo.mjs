/**
 * Prueba rápida del correo de recuperación (mismo diseño que en producción).
 *
 * Ejecuta SIEMPRE desde la carpeta backend (npm run mail:test ya lo hace):
 *   npm run mail:test -- tu_correo@gmail.com
 */

import 'dotenv/config';
import {
  isMailDeliveryConfigured,
  isResendConfigured,
  isSmtpConfigured,
  sendPasswordResetCode,
} from '../src/lib/mailer.js';

const to = process.argv[2]?.trim();

if (!to) {
  console.log(`
Prueba de correo — Mr. Kutz

  npm run mail:test -- correo@donde.recibes.com

Configura en backend/.env UNA de estas opciones:

  A) Resend (rápido para probar):
     RESEND_API_KEY=re_xxxx
     (No pongas RESEND_FROM con @gmail — Resend no lo permite. Opcional: RESEND_FROM=onboarding@resend.dev)
     → El destinatario debe ser el correo con el que abriste la cuenta en resend.com

  B) Gmail:
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=tu@gmail.com
     SMTP_PASS=clave_de_16_caracteres_aplicacion
`);
  process.exit(1);
}

if (!isMailDeliveryConfigured()) {
  console.error('❌ Falta configuración: RESEND_API_KEY o SMTP_HOST+SMTP_USER+SMTP_PASS en backend/.env');
  process.exit(1);
}

const modo = isResendConfigured() ? 'Resend' : 'SMTP';
const fallback = isResendConfigured() && isSmtpConfigured() ? ' (si falla Resend, se intenta SMTP)' : '';
console.log('Enviando vía', modo + fallback, '→', to);

const code = String(Math.floor(100000 + Math.random() * 900000));
const result = await sendPasswordResetCode({
  to,
  code,
  businessName: 'Mr. Kutz (prueba)',
});

if (result.sent) {
  console.log('✅ Listo. Revisa bandeja y spam. Código enviado:', code);
  process.exit(0);
}

console.error('❌ Error:', result.reason || 'desconocido');
console.error('   Mira el mensaje de error arriba en esta consola.');
process.exit(1);
