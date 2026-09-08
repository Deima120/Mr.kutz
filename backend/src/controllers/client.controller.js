/**
 * Client Controller - Maneja peticiones HTTP de clientes
 */

import * as clientService from '../services/client.service.js';
import { getPendingLoyaltyRewards, getClientLoyaltyProgress } from '../services/clientLoyaltyRewards.service.js';

/**
 * GET /api/clients
 * Lista clientes con búsqueda y paginación
 */
export const getAll = async (req, res, next) => {
  try {
    const { search, document, limit, offset } = req.query;
    const result = await clientService.getAll({
      search,
      document,
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
/**
 * PATCH /api/clients/:id/status
 * Activa o inactiva un cliente. Exclusivo de admin (lo impone el router).
 */
export const setStatus = async (req, res, next) => {
  try {
    const updated = await clientService.setActive(req.params.id, req.body.isActive);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }
    res.json({
      success: true,
      message: updated.is_active
        ? 'Cliente activado correctamente.'
        : 'Cliente inactivado correctamente.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

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
    const { limit, offset } = req.query;
    const history = await clientService.getServiceHistory(req.params.id, {
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:id/loyalty-rewards
 * Recompensas de fidelización ganadas y sin canjear (se aplican solas en el
 * siguiente cobro; esto es solo para que el mostrador sepa por qué el recibo
 * trae una línea gratis).
 */
export const getLoyaltyRewards = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const pending = await getPendingLoyaltyRewards(clientId);
    res.json({ success: true, data: pending });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/clients/:id/loyalty-progress
 * Cuántas citas agendadas/completadas/pagadas tiene el cliente y cuánto le
 * falta para su próximo hito de fidelización.
 */
export const getLoyaltyProgress = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const progress = await getClientLoyaltyProgress(clientId);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};
