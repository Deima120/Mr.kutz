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
  const user = await getProfile(dbUser.id);
  return { user: user || formatUserResponse(dbUser), token };
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
