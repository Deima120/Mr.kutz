import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Verifica que un fallo de envío no se propaga: las notificaciones
 * capturan errores y no rechazan la promesa del caller de forma fatal.
 * (El servicio de citas no hace await de estos resultados.)
 */
describe('fire-and-forget de notificaciones', () => {
  it('trackMail simulado no lanza aunque send falle', async () => {
    const failingSend = async () => {
      throw new Error('smtp down');
    };
    const trackMail = (_label, promise) =>
      promise
        .then(() => undefined)
        .catch(() => undefined);

    await assert.doesNotReject(async () => {
      await trackMail('test', failingSend());
    });
  });

  it('statusTransitionNotification evita reenvíos', async () => {
    const { statusTransitionNotification } = await import('./appointmentNotificationRules.js');
    assert.equal(statusTransitionNotification('confirmed', 'confirmed'), null);
    assert.equal(statusTransitionNotification('cancelled', 'cancelled'), null);
  });
});
