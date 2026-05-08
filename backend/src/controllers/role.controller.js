/**
 * Controlador de Roles.
 */

import * as roleService from '../services/role.service.js';

const actorFromReq = (req) => ({
  id: req.user?.id ?? null,
  ip: req.ip ?? null,
});

export const createRole = async (req, res, next) => {
  try {
    const role = await roleService.createRole(req.body, actorFromReq(req));
    res.status(201).json({
      success: true,
      message: 'Rol creado correctamente.',
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body, actorFromReq(req));
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Rol actualizado correctamente.',
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

export const listRoles = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await roleService.listRoles({ limit, offset });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const changeRoleState = async (req, res, next) => {
  try {
    const { activo } = req.body;
    const isActive = Boolean(activo);
    const updated = await roleService.setRoleState(req.params.id, isActive, actorFromReq(req));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Estado de rol actualizado correctamente.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getRoleDetail = async (req, res, next) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

export const assignModules = async (req, res, next) => {
  try {
    const { modulos } = req.body;
    const modules = Array.isArray(modulos) ? modulos : [];
    const data = await roleService.assignModules(
      req.params.id,
      modules,
      actorFromReq(req),
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Módulos asignados correctamente al rol.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const listModules = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await roleService.listRoleModules(req.params.id, { limit, offset });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const removeModule = async (req, res, next) => {
  try {
    const removed = await roleService.removeModuleFromRole(
      req.params.id,
      req.params.moduleId,
      actorFromReq(req),
    );
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Relación rol-módulo no encontrada.' });
    }
    res.json({
      success: true,
      message: 'Módulo eliminado del rol correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

