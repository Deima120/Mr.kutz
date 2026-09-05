/**
 * Usuarios del personal.
 *
 * Los clientes no se gestionan aquí: ver `user.service.js` para el porqué.
 */

import * as userService from '../services/user.service.js';

export const getAll = async (req, res, next) => {
  try {
    const { search, roleId, active, limit, offset } = req.query;
    const data = await userService.getAll({ search, roleId, active, limit, offset });
    res.json({ success: true, data: data.users, total: data.total });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const user = await userService.create({
      email: req.body.email,
      password: req.body.password,
      roleId: req.body.roleId,
    });
    res.status(201).json({ success: true, message: 'Usuario creado correctamente.', data: user });
  } catch (error) {
    next(error);
  }
};

export const changeRole = async (req, res, next) => {
  try {
    // El actor sale del token, nunca del cuerpo de la petición: si viniera de
    // fuera, cualquiera podría saltarse la comprobación de "no a ti mismo".
    const user = await userService.changeRole(req.params.id, req.body.roleId, req.user.id);
    res.json({ success: true, message: 'Rol actualizado correctamente.', data: user });
  } catch (error) {
    next(error);
  }
};

export const setActive = async (req, res, next) => {
  try {
    const user = await userService.setActive(req.params.id, req.body.isActive, req.user.id);
    res.json({
      success: true,
      message: user.is_active ? 'Usuario activado.' : 'Usuario desactivado.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await userService.resetPassword(req.params.id, req.body.password);
    res.json({ success: true, message: 'Contraseña restablecida correctamente.' });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const eliminado = await userService.remove(req.params.id, req.user.id);
    if (!eliminado) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    res.json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};
