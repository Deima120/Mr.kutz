/**
 * Email Service - Envío de correos con Nodemailer
 */

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Envía un correo electrónico
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"Mr. Kutz" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Envía código de recuperación de contraseña
 */
export const sendPasswordResetCode = async (email, code) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #e91e63; }
        .code-box { background: #f8f9fa; border: 2px dashed #e91e63; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px; }
        .message { color: #666; line-height: 1.6; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        .warning { color: #ff9800; font-size: 13px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✂️ Mr. Kutz</div>
        </div>
        
        <p class="message">Hola,</p>
        <p class="message">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código para continuar:</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        
        <p class="message">Este código expira en <strong>30 minutos</strong>.</p>
        <p class="warning">⚠️ Si no solicitaste este cambio, ignora este correo. Tu cuenta está segura.</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Mr. Kutz - Tu barbería de confianza</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Mr. Kutz - Código de recuperación
    
    Tu código de verificación es: ${code}
    
    Este código expira en 30 minutos.
    
    Si no solicitaste este cambio, ignora este correo.
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Código de recuperación - Mr. Kutz',
    html,
    text,
  });
};
