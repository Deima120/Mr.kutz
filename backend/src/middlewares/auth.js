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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
