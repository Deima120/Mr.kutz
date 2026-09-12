/**
 * Loyalty Controller — configuración de hitos y consulta del historial global.
 */

import {
  listMilestoneRules,
  createMilestoneRule,
  updateMilestoneRule,
  deactivateMilestoneRule,
  listLoyaltyRewardsHistory,
  chooseLoyaltyRewardOption,
  deleteMilestoneRule,
  getLoyaltyStats,
} from '../services/clientLoyaltyRewards.service.js';
import prisma from '../lib/prisma.js';

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
 * DELETE /api/loyalty/milestones/:id
 * Limpieza de un hito que nunca otorgó nada. Si ya tiene recompensas el
 * servicio responde 409 y el mensaje indica desactivarlo en su lugar.
 */
export const deleteMilestone = async (req, res, next) => {
  try {
    const rule = await deleteMilestoneRule(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Hito no encontrado.' });
    }
    res.json({ success: true, message: 'Hito eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/loyalty/stats
 * Indicadores del programa para la cabecera de la pantalla de Fidelización.
 */
export const getStats = async (req, res, next) => {
  try {
    const stats = await getLoyaltyStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/loyalty/rewards/:id/choose
 * El staff elige, en nombre del cliente, cuál opción de premio le corresponde
 * a una recompensa otorgada y aún sin elegir — para el mostrador, cuando el
 * cliente no usa la app. El `clientId` de confianza sale de la propia
 * recompensa (nunca del body): evita que alguien mande un id ajeno.
 */
export const chooseRewardOption = async (req, res, next) => {
  try {
    const rewardId = parseInt(req.params.id, 10);
    const existing = await prisma.clientLoyaltyReward.findUnique({
      where: { id: rewardId },
      select: { clientId: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Recompensa no encontrada.' });
    }
    const reward = await chooseLoyaltyRewardOption(rewardId, req.body.optionId, existing.clientId);
    res.json({ success: true, message: 'Premio elegido correctamente.', data: reward });
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
