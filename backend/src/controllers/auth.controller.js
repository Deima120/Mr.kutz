/**
 * Auth Controller - Maneja peticiones HTTP de autenticación
 */

import * as authService from '../services/auth.service.js';

/**
 * POST /api/auth/register
 * Registra nuevo usuario (client por defecto)
 */
export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login con email y password
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Obtiene perfil del usuario autenticado (requiere JWT)
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};
