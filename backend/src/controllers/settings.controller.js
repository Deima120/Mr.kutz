/**
 * Settings Controller — solo lectura pública.
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
