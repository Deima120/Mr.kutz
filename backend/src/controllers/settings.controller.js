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
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }
    res.json({ success: true, message: 'Settings updated', data: settings });
  } catch (error) {
    next(error);
  }
};
