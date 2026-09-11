/**
 * Client Controller - Maneja peticiones HTTP de clientes
 */

import * as clientService from '../services/client.service.js';
import {
  getPendingLoyaltyRewards,
  getClientLoyaltyProgress,
  getPendingRewardChoices,
  chooseLoyaltyRewardOption,
} from '../services/clientLoyaltyRewards.service.js';

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
 * Recompensas de fidelización de este cliente para el mostrador:
 *  - `pendingRedeem`: ya elegidas, se aplican solas en el siguiente cobro
 *    (esto es lo que había antes, para que el mostrador sepa por qué el
 *    recibo trae una línea gratis).
 *  - `pendingChoice`: otorgadas pero sin elegir opción — el staff puede
 *    elegir aquí en nombre del cliente (mostrador) o al agendarle una cita
 *    (`AppointmentForm.jsx`).
 */
export const getLoyaltyRewards = async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const [pendingRedeem, pendingChoice] = await Promise.all([
      getPendingLoyaltyRewards(clientId),
      getPendingRewardChoices(clientId),
    ]);
    res.json({ success: true, data: { pendingRedeem, pendingChoice } });
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

/**
 * GET /api/clients/me/loyalty
 * Autoservicio: todo lo que el cliente autenticado necesita ver de su propia
 * fidelización en un solo llamado — el id sale de `req.user.client_id` (nunca
 * de un parámetro), así que un cliente jamás puede pedir lo de otro:
 *  - `pendingRedeem`: premios ya elegidos, listos para canjear solos en su
 *    próximo cobro (lo que ya existía).
 *  - `pendingChoice`: premios otorgados pero SIN elegir opción todavía, con
 *    las opciones disponibles resueltas — para ofrecerle la elección al
 *    agendar o en su pantalla de Fidelización.
 *  - `progress`: cuánto le falta para su próximo hito.
 */
export const getMyLoyalty = async (req, res, next) => {
  try {
    const clientId = req.user?.client_id;
    if (!clientId) {
      return res.status(403).json({ success: false, message: 'Esta cuenta no tiene ficha de cliente.' });
    }
    const [pendingRedeem, pendingChoice, progress] = await Promise.all([
      getPendingLoyaltyRewards(clientId),
      getPendingRewardChoices(clientId),
      getClientLoyaltyProgress(clientId),
    ]);
    res.json({ success: true, data: { pendingRedeem, pendingChoice, progress } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/clients/me/loyalty/:rewardId/choose
 * El cliente elige, para uno de sus propios premios pendientes, cuál de las
 * opciones del hito quiere. El `clientId` de confianza sale de
 * `req.user.client_id`; `chooseLoyaltyRewardOption` además comprueba que el
 * premio sea de verdad suyo.
 */
export const chooseMyLoyaltyOption = async (req, res, next) => {
  try {
    const clientId = req.user?.client_id;
    if (!clientId) {
      return res.status(403).json({ success: false, message: 'Esta cuenta no tiene ficha de cliente.' });
    }
    const reward = await chooseLoyaltyRewardOption(req.params.rewardId, req.body.optionId, clientId);
    res.json({ success: true, message: 'Premio elegido correctamente.', data: reward });
  } catch (error) {
    next(error);
  }
};
