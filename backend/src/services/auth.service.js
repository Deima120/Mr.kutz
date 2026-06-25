/**
 * Auth Service - Lógica de autenticación (Prisma)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { sendPasswordResetCode, isMailDeliveryConfigured } from '../lib/mailer.js';
import { canonicalEmail } from '../utils/emailCanonical.js';
import { hashResetCode, verifyResetCodeHash } from '../utils/resetCodeHash.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const RESET_CODE_TTL_MS = 30 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const RESET_MAX_VERIFY_ATTEMPTS = 5;
const GENERIC_RESET_MESSAGE =
  'Si el correo está registrado en Mr. Kutz, recibirás un código de verificación en breve. Revisa también la carpeta de spam.';

function generateResetCode() {
  return String(randomInt(100000, 1000000));
}

function isResetInCooldown(user) {
  if (!user?.resetCodeExpires || !user?.resetCode) return false;
  const expiresAt = new Date(user.resetCodeExpires);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return false;
  const issuedAt = new Date(expiresAt.getTime() - RESET_CODE_TTL_MS);
  return Date.now() - issuedAt.getTime() < RESET_RESEND_COOLDOWN_MS;
}

async function resolveBusinessName() {
  try {
    const settings = await prisma.businessSetting.findFirst({
      orderBy: { id: 'asc' },
      select: { businessName: true },
    });
    if (settings?.businessName?.trim()) {
      return settings.businessName.trim();
    }
  } catch (settingsError) {
    console.warn(
      '[password-reset] No se pudo leer business settings:',
      settingsError?.message || settingsError
    );
  }
  return 'Mr. Kutz';
}

function canRequestPasswordReset(user) {
  if (!user) return false;
  if (!user.isActive) return false;
  if (!user.passwordHash) return false;
  return true;
}

export const register = async (userData) => {
  const {
    email,
    password,
    role: requestedRole,
    firstName,
    lastName,
    phone,
    documentType,
    documentNumber,
  } = userData;

  // Registro público: solo clientes. Admin/barber se crean desde el panel o scripts.
  const role = 'client';
  if (requestedRole && requestedRole !== 'client') {
    const error = new Error('El registro público solo está disponible para clientes.');
    error.statusCode = 403;
    throw error;
  }

  const docType = documentType != null ? String(documentType).trim().slice(0, 40) : '';
  const docNum = documentNumber != null ? String(documentNumber).trim().slice(0, 80) : '';
  if (!docType || !docNum) {
    const error = new Error('El tipo y número de documento son obligatorios.');
    error.statusCode = 400;
    throw error;
  }

  const emailNorm = canonicalEmail(email);
  const existingUser = await prisma.user.findUnique({
    where: { email: emailNorm },
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
        email: emailNorm,
        passwordHash,
        roleId: roleRecord.id,
      },
      select: { id: true, email: true, roleId: true, isActive: true, createdAt: true },
    });

    await tx.client.create({
      data: {
        userId: user.id,
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || null,
        email: emailNorm,
        documentType: docType,
        documentNumber: docNum,
      },
    });

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
  const emailNorm = canonicalEmail(email);
  const dbUser = await prisma.user.findUnique({
    where: { email: emailNorm },
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

// Solicitar recuperación de contraseña (solo correos registrados y activos)
export const forgotPassword = async (email) => {
  const emailNorm = canonicalEmail(email);
  const dbUser = await prisma.user.findUnique({
    where: { email: emailNorm },
  });

  if (!canRequestPasswordReset(dbUser)) {
    return { message: GENERIC_RESET_MESSAGE };
  }

  if (isResetInCooldown(dbUser)) {
    return {
      message: GENERIC_RESET_MESSAGE,
      emailSent: true,
      cooldown: true,
    };
  }

  if (!isMailDeliveryConfigured()) {
    console.error('[forgotPassword] Correo no configurado (SMTP ni Resend).');
    return {
      message: GENERIC_RESET_MESSAGE,
      emailSent: false,
    };
  }

  const resetCode = generateResetCode();
  const resetCodeHash = hashResetCode(resetCode);
  const resetExpires = new Date(Date.now() + RESET_CODE_TTL_MS);

  const [, businessName] = await Promise.all([
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        resetCode: resetCodeHash,
        resetCodeExpires: resetExpires,
        resetCodeAttempts: 0,
      },
    }),
    resolveBusinessName(),
  ]);

  const delivery = await sendPasswordResetCode({
    to: dbUser.email,
    code: resetCode,
    businessName,
  });

  if (!delivery?.sent) {
    const reason = delivery?.reason || 'unknown';
    console.error(
      '[forgotPassword] No se pudo enviar el correo de recuperación:',
      reason,
      delivery?.smtpError ? `| ${delivery.smtpError}` : '',
      delivery?.resendError ? `| ${delivery.resendError}` : ''
    );
    if (reason === 'resend_sandbox') {
      console.error(
        '[forgotPassword] Resend sandbox: configura Brevo SMTP o verifica dominio en Resend (ver backend/.env.example).'
      );
    }
  }

  return {
    message: GENERIC_RESET_MESSAGE,
    emailSent: !!delivery?.sent,
    ...(process.env.NODE_ENV !== 'production' && delivery?.sent && { resetCode }),
  };
};

// Verificar código de recuperación
export const verifyResetCode = async (email, code) => {
  const emailNorm = canonicalEmail(email);
  const dbUser = await prisma.user.findUnique({
    where: { email: emailNorm },
  });

  if (!canRequestPasswordReset(dbUser) || !dbUser.resetCode || !dbUser.resetCodeExpires) {
    const error = new Error('El código no es válido o ha caducado.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > dbUser.resetCodeExpires) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { resetCode: null, resetCodeExpires: null, resetCodeAttempts: 0 },
    });
    const error = new Error('El código ha caducado. Solicita uno nuevo.');
    error.statusCode = 400;
    throw error;
  }

  if ((dbUser.resetCodeAttempts ?? 0) >= RESET_MAX_VERIFY_ATTEMPTS) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { resetCode: null, resetCodeExpires: null, resetCodeAttempts: 0 },
    });
    const error = new Error(
      'Demasiados intentos fallidos. Solicita un nuevo código de verificación.'
    );
    error.statusCode = 400;
    throw error;
  }

  const codeNorm = String(code ?? '').trim();
  const codeValid = await verifyResetCodeHash(codeNorm, dbUser.resetCode);

  if (!codeValid) {
    const attempts = (dbUser.resetCodeAttempts ?? 0) + 1;
    const remaining = Math.max(0, RESET_MAX_VERIFY_ATTEMPTS - attempts);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        resetCodeAttempts: attempts,
        ...(remaining === 0
          ? { resetCode: null, resetCodeExpires: null, resetCodeAttempts: 0 }
          : {}),
      },
    });
    const error = new Error(
      remaining > 0
        ? `El código no es correcto. Te quedan ${remaining} intento(s).`
        : 'Demasiados intentos fallidos. Solicita un nuevo código de verificación.'
    );
    error.statusCode = 400;
    throw error;
  }

  return { valid: true };
};

// Resetear contraseña con código
export const resetPassword = async (email, code, newPassword) => {
  await verifyResetCode(email, code);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { email: canonicalEmail(email) },
    data: {
      passwordHash,
      resetCode: null,
      resetCodeExpires: null,
      resetCodeAttempts: 0,
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
  const {
    passwordHash: _ph,
    resetCode: _rc,
    resetCodeExpires: _rce,
    resetCodeAttempts: _rca,
    role: roleObj,
    barber,
    client,
    roleId: _rid,
    ..._rest
  } = dbUser;
  return {
    id: dbUser.id,
    email: dbUser.email,
    role: roleObj?.name || extra.role,
    isActive: dbUser.isActive,
    firstName: extra.firstName ?? barber?.firstName ?? client?.firstName,
    lastName: extra.lastName ?? barber?.lastName ?? client?.lastName,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
};
