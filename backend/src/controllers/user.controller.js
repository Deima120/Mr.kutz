/**
 * Controlador de Gestión de Usuarios.
 */

import * as userService from '../services/user.service.js';

const actorFromReq = (req) => ({
  id: req.user?.id ?? null,
  ip: req.ip ?? null,
});

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, actorFromReq(req));
    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { limit, offset, search } = req.query;
    const data = await userService.listUsers({ limit, offset, search });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getUserDetail = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, actorFromReq(req));
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Usuario actualizado correctamente.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserState = async (req, res, next) => {
  try {
    const { activo } = req.body;
    const isActive = Boolean(activo);
    const user = await userService.setUserState(req.params.id, isActive, actorFromReq(req));
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Estado de usuario actualizado correctamente.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

