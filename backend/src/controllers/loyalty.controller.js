/**
 * Loyalty Controller — configuración de hitos y consulta del historial global.
 */

import {
  listMilestoneRules,
  createMilestoneRule,
  updateMilestoneRule,
  deactivateMilestoneRule,
  listLoyaltyRewardsHistory,
} from '../services/clientLoyaltyRewards.service.js';

export const getMilestoneRules = async (req, res, next) => {
  try {
    const rules = await listMilestoneRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

export const createMilestone = async (req, res, next) => {
  try {
    const rule = await createMilestoneRule(req.body);
    res.status(201).json({ success: true, message: 'Hito creado correctamente.', data: rule });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    const rule = await updateMilestoneRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Hito no encontrado.' });
    }
    res.json({ success: true, message: 'Hito actualizado correctamente.', data: rule });
  } catch (error) {
    next(error);
  }
};

export const deactivateMilestone = async (req, res, next) => {
  try {
    const rule = await deactivateMilestoneRule(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Hito no encontrado.' });
    }
    res.json({ success: true, message: 'Hito desactivado correctamente.', data: rule });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/loyalty/rewards
 * Historial paginado de recompensas otorgadas (todos los clientes, o filtrado
 * por `clientId`/`status`).
 */
export const getRewardsHistory = async (req, res, next) => {
  try {
    const { limit, offset, clientId, status } = req.query;
    const result = await listLoyaltyRewardsHistory({
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
      clientId: clientId ? parseInt(clientId, 10) : undefined,
      status: ['pending', 'redeemed'].includes(status) ? status : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
