import * as exceptionService from '../services/barberScheduleException.service.js';

export const list = async (req, res, next) => {
  try {
    const { barberId, from, to, includeCancelled } = req.query;
    const rows = await exceptionService.list({
      barberId,
      from,
      to,
      includeCancelled: includeCancelled === 'true',
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const result = await exceptionService.create(req.body, { createdBy: req.user?.id });
    if (!result.created) {
      // Hay citas agendadas en el rango y el admin todavía no confirmó — no se
      // guardó nada. 200, no 201: no se creó ningún recurso.
      return res.json({
        success: true,
        message: 'Hay citas agendadas en ese rango. Confirma para registrar la ausencia igual.',
        data: result,
      });
    }
    res.status(201).json({
      success: true,
      message:
        result.exceptions.length > 1
          ? `Ausencia registrada para ${result.exceptions.length} barberos.`
          : 'Ausencia registrada correctamente.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const row = await exceptionService.cancel(req.params.id, { cancelledBy: req.user?.id });
    res.json({ success: true, message: 'Ausencia cancelada.', data: row });
  } catch (error) {
    next(error);
  }
};

export const cancelBatch = async (req, res, next) => {
  try {
    const result = await exceptionService.cancelBatch(req.params.batchId, {
      cancelledBy: req.user?.id,
    });
    res.json({
      success: true,
      message: `${result.cancelled} ausencia(s) canceladas.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
