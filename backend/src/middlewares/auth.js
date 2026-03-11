/**
 * Middleware de autenticación y autorización
 * - auth: Verifica JWT
 * - authorize: Verifica roles permitidos
 */

import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

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

    // Obtener usuario con rol
    const result = await pool.query(
      `SELECT u.id, u.email, u.role_id, u.is_active, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    req.user = result.rows[0];

    // Para barber: añadir barber_id; para client: añadir client_id (para forzar filtros en APIs)
    if (req.user.role_name === 'barber') {
      const barberRow = await pool.query('SELECT id FROM barbers WHERE user_id = $1', [decoded.userId]);
      if (barberRow.rows[0]) req.user.barber_id = barberRow.rows[0].id;
    } else if (req.user.role_name === 'client') {
      const clientRow = await pool.query('SELECT id FROM clients WHERE user_id = $1', [decoded.userId]);
      if (clientRow.rows[0]) req.user.client_id = clientRow.rows[0].id;
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
