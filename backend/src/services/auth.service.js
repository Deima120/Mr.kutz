/**
 * Auth Service - Lógica de autenticación (Prisma)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { sendPasswordResetCode } from '../lib/mailer.js';
import * as settingsService from './settings.service.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

export const register = async (userData) => {
  const { email, password, role = 'client', firstName, lastName, phone } = userData;

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error('Este correo electrónico ya está registrado.');
    error.statusCode = 409;
    throw error;
  }

  const roleRecord = await prisma.role.findUnique({
    where: { name: role },
  });

  if (!roleRecord) {
    const error = new Error('El rol no es válido.');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        roleId: roleRecord.id,
      },
      select: { id: true, email: true, roleId: true, isActive: true, createdAt: true },
    });

    if (role === 'client') {
      await tx.client.create({
        data: {
          userId: user.id,
          firstName: firstName || '',
          lastName: lastName || '',
          phone: phone || null,
          email: email.toLowerCase(),
        },
      });
    } else if (role === 'barber') {
      await tx.barber.create({
        data: {
          userId: user.id,
          firstName: firstName || '',
          lastName: lastName || '',
          phone: phone || null,
        },
      });
    }

    const userWithRole = await tx.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });
    return userWithRole;
  });

  const token = generateToken(result.id);
  const user = await getProfile(result.id);
  return {
    user: user || formatUserResponse(result, { firstName, lastName, role }),
    token,
  };
};

export const login = async (email, password) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { role: true },
  });

  if (!dbUser) {
    const error = new Error(
      'No existe una cuenta con este correo electrónico. Verifica que esté bien escrito o regístrate si aún no tienes cuenta.'
    );
    error.statusCode = 401;
    error.reason = 'USER_NOT_FOUND';
    throw error;
  }

  if (!dbUser.isActive) {
    const error = new Error('Tu cuenta está desactivada. Contacta al administrador.');
    error.statusCode = 401;
    error.reason = 'ACCOUNT_DISABLED';
    throw error;
  }

  if (!dbUser.passwordHash) {
    const error = new Error(
      'Esta cuenta no puede iniciar sesión de forma habitual. Contacta al administrador.'
    );
    error.statusCode = 401;
    error.reason = 'NO_PASSWORD';
    throw error;
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, dbUser.passwordHash);
  } catch (bcryptError) {
    console.error('Login bcrypt error:', bcryptError?.message || bcryptError);
    const error = new Error('No pudimos verificar la contraseña. Intenta de nuevo.');
    error.statusCode = 401;
    error.reason = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (!isValidPassword) {
    const error = new Error(
      'La contraseña no es correcta. Comprueba mayúsculas y números, o usa «¿Olvidaste tu contraseña?» si la olvidaste.'
    );
    error.statusCode = 401;
    error.reason = 'INVALID_PASSWORD';
    throw error;
  }

  const token = generateToken(dbUser.id);
  const user = await getProfile(dbUser.id);
  return { user: user || formatUserResponse(dbUser), token };
};

// Solicitar recuperación de contraseña
export const forgotPassword = async (email) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!dbUser) {
    // Por seguridad, no revelamos si el email existe o no
    return { message: 'Si el correo existe, recibirás instrucciones en breve.' };
  }

  // Generar código de recuperación (6 dígitos)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      resetCode,
      resetCodeExpires: resetExpires,
    },
  });

  let mailResult = { sent: false };
  try {
    const settings = await settingsService.getSettings();
    const businessName = settings?.business_name || 'Mr. Kutz';
    mailResult = await sendPasswordResetCode({
      to: dbUser.email,
      code: resetCode,
      businessName,
    });
  } catch (e) {
    console.error('[auth] Error al enviar correo de recuperación:', e?.message || e);
    mailResult = { sent: false, reason: 'error' };
  }

  if (!mailResult.sent) {
    console.warn(
      `[auth] Recuperación: correo no enviado (${mailResult.reason || 'desconocido'}) para ${email}. Código solo en logs del servidor (no se expone al cliente).`
    );
    console.log(`[auth] Código de recuperación (${email}): ${resetCode}`);
  }

  // Nunca devolvemos resetCode en la API: el código solo debe llegar por correo (o ver logs del backend si falla el envío).
  return {
    message: 'Si el correo existe, recibirás instrucciones en breve.',
  };
};

// Verificar código de recuperación
export const verifyResetCode = async (email, code) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!dbUser || !dbUser.resetCode || !dbUser.resetCodeExpires) {
    const error = new Error('El código no es válido o ha caducado.');
    error.statusCode = 400;
    throw error;
  }

  if (dbUser.resetCode !== code) {
    const error = new Error('El código no es correcto.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > dbUser.resetCodeExpires) {
    const error = new Error('El código ha caducado.');
    error.statusCode = 400;
    throw error;
  }

  return { valid: true };
};

// Resetear contraseña con código
export const resetPassword = async (email, code, newPassword) => {
  // Verificar código primero
  await verifyResetCode(email, code);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      passwordHash,
      resetCode: null,
      resetCodeExpires: null,
    },
  });

  return { message: 'Contraseña actualizada correctamente.' };
};

export const getProfile = async (userId) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, client: true, barber: true },
  });

  if (!dbUser) return null;

  let profile = formatUserResponse(dbUser);

  if (dbUser.role?.name === 'client' && dbUser.client) {
    profile = {
      ...profile,
      clientId: dbUser.client.id,
      firstName: dbUser.client.firstName,
      lastName: dbUser.client.lastName,
      phone: dbUser.client.phone,
    };
  } else if (dbUser.role?.name === 'barber' && dbUser.barber) {
    profile = {
      ...profile,
      barberId: dbUser.barber.id,
      firstName: dbUser.barber.firstName,
      lastName: dbUser.barber.lastName,
      phone: dbUser.barber.phone,
      specialties: dbUser.barber.specialties,
    };
  }

  return profile;
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: TOKEN_EXPIRES }
  );
};

const formatUserResponse = (dbUser, extra = {}) => {
  const { passwordHash, role: roleObj, barber, client, ...rest } = dbUser;
  return {
    id: dbUser.id,
    email: dbUser.email,
    role: roleObj?.name || extra.role,
    isActive: dbUser.isActive,
    firstName: extra.firstName ?? barber?.firstName ?? client?.firstName,
    lastName: extra.lastName ?? barber?.lastName ?? client?.lastName,
    ...rest,
  };
};
