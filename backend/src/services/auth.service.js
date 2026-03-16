/**
 * Auth Service - Lógica de autenticación (Prisma)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

export const register = async (userData) => {
  const { email, password, role = 'client', firstName, lastName, phone } = userData;

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const roleRecord = await prisma.role.findUnique({
    where: { name: role },
  });

  if (!roleRecord) {
    const error = new Error('Invalid role');
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
  return {
    user: formatUserResponse(result, { firstName, lastName, role }),
    token,
  };
};

export const login = async (email, password) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { role: true },
  });

  if (!dbUser) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!dbUser.isActive) {
    const error = new Error('Account is inactive');
    error.statusCode = 401;
    throw error;
  }

  if (!dbUser.passwordHash) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, dbUser.passwordHash);
  } catch (bcryptError) {
    console.error('Login bcrypt error:', bcryptError?.message || bcryptError);
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!isValidPassword) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(dbUser.id);
  const user = formatUserResponse(dbUser);
  return { user, token };
};

// Solicitar recuperación de contraseña
export const forgotPassword = async (email) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!dbUser) {
    // Por seguridad, no revelamos si el email existe o no
    return { message: 'If the email exists, you will receive instructions' };
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

  // En producción, aquí se enviaría un email con el código
  // Por ahora, lo retornamos para pruebas (en producción, eliminar esto)
  console.log(`Reset code for ${email}: ${resetCode}`);

  return { 
    message: 'If the email exists, you will receive instructions',
    // Solo para desarrollo - ELIMINAR EN PRODUCCIÓN
    ...(process.env.NODE_ENV !== 'production' && { resetCode })
  };
};

// Verificar código de recuperación
export const verifyResetCode = async (email, code) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!dbUser || !dbUser.resetCode || !dbUser.resetCodeExpires) {
    const error = new Error('Invalid or expired code');
    error.statusCode = 400;
    throw error;
  }

  if (dbUser.resetCode !== code) {
    const error = new Error('Invalid code');
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > dbUser.resetCodeExpires) {
    const error = new Error('Code has expired');
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

  return { message: 'Password updated successfully' };
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
