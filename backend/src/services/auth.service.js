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

export const checkEmailAvailability = async (email) => {
  const emailNorm = canonicalEmail(email);
  if (!emailNorm) {
    const error = new Error('Indica un correo electrónico válido.');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { id: true },
  });

  return { available: !existingUser };
};

/**
 * Comprueba si tipo+número de documento ya están registrados en un cliente.
 * available: true → se puede usar en registro; false → ya existe.
 */
export const checkDocumentAvailability = async (documentType, documentNumber) => {
  const docType = documentType != null ? String(documentType).trim().slice(0, 40) : '';
  const docNum = documentNumber != null ? String(documentNumber).trim().slice(0, 80) : '';

  if (!docType || !docNum) {
    const error = new Error('El tipo y número de documento son obligatorios.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.client.findFirst({
    where: {
      documentType: docType,
      documentNumber: docNum,
    },
    select: { id: true },
  });

  return { available: !existing };
};

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

  const docAvailability = await checkDocumentAvailability(docType, docNum);
  if (!docAvailability.available) {
    const error = new Error('Ya existe un cliente con este documento.');
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

const GENERIC_LOGIN_MESSAGE = 'Correo o contraseña incorrectos.';

export const login = async (email, password) => {
  const emailNorm = canonicalEmail(email);
  const dbUser = await prisma.user.findUnique({
    where: { email: emailNorm },
    include: { role: true },
  });

  // Mensaje genérico para no revelar si el correo existe (anti-enumeración).
  if (!dbUser || !dbUser.passwordHash) {
    const error = new Error(GENERIC_LOGIN_MESSAGE);
    error.statusCode = 401;
    error.reason = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (!dbUser.isActive) {
    const error = new Error('Tu cuenta está desactivada. Contacta al administrador.');
    error.statusCode = 401;
    error.reason = 'ACCOUNT_DISABLED';
    throw error;
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, dbUser.passwordHash);
  } catch (bcryptError) {
    console.error('Login bcrypt error:', bcryptError?.message || bcryptError);
    const error = new Error(GENERIC_LOGIN_MESSAGE);
    error.statusCode = 401;
    error.reason = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (!isValidPassword) {
    const error = new Error(GENERIC_LOGIN_MESSAGE);
    error.statusCode = 401;
    error.reason = 'INVALID_CREDENTIALS';
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
    console.error('[forgotPassword] Correo no configurado (BREVO_API_KEY, Resend o SMTP).');
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
      delivery?.resendError ? `| ${delivery.resendError}` : '',
      delivery?.brevoError ? `| ${delivery.brevoError}` : ''
    );
    if (reason === 'brevo_ip_blocked') {
      console.error(
        '[forgotPassword] Brevo: desactiva IPs autorizadas en https://app.brevo.com/security/authorised_ips (Render cambia de IP).'
      );
    }
    if (reason === 'resend_sandbox') {
      console.error(
        '[forgotPassword] Resend sandbox: configura BREVO_API_KEY o verifica dominio en Resend (ver backend/.env.example).'
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

/**
 * Actualiza el perfil del usuario autenticado (nombre, apellido, teléfono, correo).
 *
 * Sirve para los roles `client` y `barber`; el correo siempre vive en `User`,
 * mientras que nombre, apellido y teléfono viven en la tabla del perfil
 * correspondiente (`Client` o `Barber`). Todo se escribe en una transacción para
 * que no queden desincronizados.
 *
 * No se admite editar aquí datos que son competencia del administrador
 * (documento, especialidades, comisión).
 */
export const updateProfile = async (userId, data = {}) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, client: true, barber: true },
  });

  if (!dbUser) {
    const err = new Error('Usuario no encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const roleName = dbUser.role?.name;
  const profile =
    roleName === 'client' ? dbUser.client : roleName === 'barber' ? dbUser.barber : null;

  if (!profile) {
    const err = new Error('Tu rol no permite editar el perfil desde aquí.');
    err.statusCode = 403;
    throw err;
  }

  const firstName = String(data.firstName ?? '').trim();
  const lastName = String(data.lastName ?? '').trim();
  if (!firstName || !lastName) {
    const err = new Error('Nombre y apellido son obligatorios.');
    err.statusCode = 400;
    throw err;
  }

  const phoneRaw = data.phone != null ? String(data.phone).trim() : '';
  const phone = phoneRaw || null;
  const emailNorm = canonicalEmail(data.email);
  if (!emailNorm) {
    const err = new Error('Indica un correo electrónico válido.');
    err.statusCode = 400;
    throw err;
  }

  if (emailNorm !== canonicalEmail(dbUser.email)) {
    const taken = await prisma.user.findFirst({
      where: { email: emailNorm, NOT: { id: dbUser.id } },
      select: { id: true },
    });
    if (taken) {
      const err = new Error('Este correo electrónico ya está registrado.');
      err.statusCode = 409;
      throw err;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: dbUser.id },
      data: { email: emailNorm },
    });

    if (roleName === 'client') {
      // `Client` guarda una copia denormalizada del correo; hay que mantenerla al día.
      await tx.client.update({
        where: { id: profile.id },
        data: { firstName, lastName, phone, email: emailNorm },
      });
    } else {
      // `Barber` no tiene columna de correo: el suyo vive solo en `User`.
      await tx.barber.update({
        where: { id: profile.id },
        data: { firstName, lastName, phone },
      });
    }
  });

  return getProfile(userId);
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
