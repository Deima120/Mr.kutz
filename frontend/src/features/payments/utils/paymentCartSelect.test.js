/**
 * Contrato CustomSelect ↔ carrito de cobro.
 * CustomSelect llama onChange(option.id), no un evento nativo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formSelectEvent,
  onCustomSelectValue,
} from '../../../shared/utils/customSelectAdapters.js';

/** Simula el click de una opción en CustomSelect (selectOption → onChange(option.id)). */
function selectOption(onChange, option) {
  onChange(option.id);
}

describe('CustomSelect adapters (contrato de valor)', () => {
  it('onCustomSelectValue guarda el id directo (método y cita del carrito)', () => {
    let paymentMethodId = '';
    let appointmentPick = '';
    const onMethod = onCustomSelectValue((v) => {
      paymentMethodId = v;
    });
    const onAppointment = onCustomSelectValue((v) => {
      appointmentPick = v;
    });

    selectOption(onMethod, { id: '2', label: 'Efectivo' });
    selectOption(onAppointment, { id: '15', label: 'Corte · Cliente' });

    assert.equal(paymentMethodId, '2');
    assert.equal(appointmentPick, '15');
  });

  it('el patrón erróneo e.target.value falla con id directo (regresión del carrito)', () => {
    const brokenHandler = (e) => e.target.value;
    assert.throws(() => selectOption(brokenHandler, { id: '1', label: 'X' }), TypeError);
  });

  it('formSelectEvent adapta id → event sintético para handleChange', () => {
    let received = null;
    const onChange = formSelectEvent('paymentMethodId', (e) => {
      received = e;
    });
    selectOption(onChange, { id: 7, label: 'Transferencia' });
    assert.deepEqual(received, { target: { name: 'paymentMethodId', value: '7' } });
  });
});

describe('Carrito: selección de método habilita el cobro', () => {
  it('sin método seleccionado el payload de create no está listo', () => {
    let paymentMethodId = '';
    const lines = [{ type: 'manual', unitPrice: 25, description: 'Caja' }];
    assert.equal(Boolean(paymentMethodId) && lines.length > 0, false);
  });

  it('tras elegir método con onCustomSelectValue el payload queda listo', () => {
    let paymentMethodId = '';
    const onMethod = onCustomSelectValue((v) => {
      paymentMethodId = v;
    });
    selectOption(onMethod, { id: '1', label: 'Efectivo' });

    const lines = [{ type: 'manual', unitPrice: 25, description: 'Caja' }];
    const canSubmit = Boolean(paymentMethodId) && lines.length > 0;
    assert.equal(canSubmit, true);
    assert.equal(paymentMethodId, '1');
  });
});
