/**
 * Auth Controller - Maneja peticiones HTTP de autenticación
 */

import * as authService from '../services/auth.service.js';
import {
  clearLoginAttempts,
  registerFailedLogin,
} from '../middlewares/loginThrottle.js';

/**
 * POST /api/auth/register
 * Registra nuevo usuario (client por defecto)
 */
export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente.',
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
    clearLoginAttempts(req);
    res.json({
      success: true,
      message: 'Sesión iniciada correctamente.',
      data: result,
    });
  } catch (error) {
    if (error?.statusCode === 401) {
      registerFailedLogin(req);
    }
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
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Solicita recuperación de contraseña
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json({
      success: true,
      message: result.message,
      emailSent: result.emailSent ?? null,
      ...(result.resetCode ? { resetCode: result.resetCode } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-code
 * Verifica código de recuperación
 */
export const verifyResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyResetCode(email, code);
    res.json({
      success: true,
      valid: result.valid,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Resetea contraseña con código
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    const result = await authService.resetPassword(email, code, newPassword);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
