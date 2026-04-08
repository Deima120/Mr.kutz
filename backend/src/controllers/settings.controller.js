/**
 * Settings Controller
 */

import * as settingsService from '../services/settings.service.js';

export const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getPublicSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.body);
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada.' });
    }
    res.json({ success: true, message: 'Configuración actualizada.', data: settings });
  } catch (error) {
    next(error);
  }
};
