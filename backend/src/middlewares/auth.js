/**
 * Middleware de autenticación y autorización (Prisma)
 * - auth: Verifica JWT
 * - authorize: Verifica roles permitidos
 */

import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

/**
 * Verifica que el token JWT sea válido
 * Adjunta el usuario a req.user
 */
export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role_id: user.roleId,
      is_active: user.isActive,
      role_name: user.role?.name,
    };

    if (user.role?.name === 'barber') {
      const barber = await prisma.barber.findUnique({
        where: { userId: user.id },
      });
      if (barber) req.user.barber_id = barber.id;
    } else if (user.role?.name === 'client') {
      const client = await prisma.client.findUnique({
        where: { userId: user.id },
      });
      if (client) req.user.client_id = client.id;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Autoriza acceso basado en roles
 * @param {string[]} allowedRoles - Array de nombres de roles permitidos
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }

    next();
  };
};
