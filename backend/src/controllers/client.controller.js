/**
 * Client Controller - Maneja peticiones HTTP de clientes
 */

import * as clientService from '../services/client.service.js';

/**
 * GET /api/clients
 * Lista clientes con búsqueda y paginación
 */
export const getAll = async (req, res, next) => {
  try {
    const { search, limit, offset } = req.query;
    const result = await clientService.getAll({
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:id
 * Obtiene un cliente por ID
 */
export const getById = async (req, res, next) => {
  try {
    const client = await clientService.getById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }
    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/clients
 * Crea un nuevo cliente
 */
export const create = async (req, res, next) => {
  try {
    const client = await clientService.create({
      ...req.body,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    });
    res.status(201).json({
      success: true,
      message: 'Cliente creado correctamente.',
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/clients/:id
 * Actualiza un cliente
 */
export const update = async (req, res, next) => {
  try {
    const client = await clientService.update(req.params.id, req.body);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Cliente actualizado correctamente.',
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/clients/:id
 * Elimina un cliente
 */
export const remove = async (req, res, next) => {
  try {
    const deleted = await clientService.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Cliente eliminado correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:id/history
 * Obtiene historial de servicios del cliente
 */
export const getHistory = async (req, res, next) => {
  try {
    const history = await clientService.getServiceHistory(req.params.id);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
