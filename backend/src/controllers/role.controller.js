/**
 * Roles y permisos.
 */

import * as roleService from '../services/role.service.js';

export const getAll = async (req, res, next) => {
  try {
    res.json({ success: true, data: await roleService.getAll() });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const role = await roleService.getById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

/** Catálogo de permisos agrupado por módulo, para pintar las casillas. */
export const getPermissions = async (req, res, next) => {
  try {
    res.json({ success: true, data: await roleService.getPermissionCatalog() });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    // Los permisos del actor se pasan al servicio para impedir que conceda más de
    // lo que él mismo tiene.
    const role = await roleService.create(req.body, req.user.permissions);
    res.status(201).json({ success: true, message: 'Rol creado correctamente.', data: role });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const role = await roleService.update(req.params.id, req.body, req.user.permissions);
    res.json({ success: true, message: 'Rol actualizado correctamente.', data: role });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const eliminado = await roleService.remove(req.params.id);
    if (!eliminado) return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    res.json({ success: true, message: 'Rol eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};
