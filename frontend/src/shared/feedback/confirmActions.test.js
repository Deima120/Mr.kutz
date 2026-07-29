import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getConfirmFooterActions } from './confirmActions.js';
import { getConfirmVariantConfig, normalizeConfirmVariant } from './confirmConfig.js';

describe('AdminConfirmModal — contrato Cancelar / Confirmar', () => {
  it('Cancelar invoca onCancel y NO invoca onConfirm', () => {
    let confirmed = false;
    let cancelled = false;
    const { handleCancel } = getConfirmFooterActions({
      onConfirm: () => {
        confirmed = true;
      },
      onCancel: () => {
        cancelled = true;
      },
    });

    handleCancel();

    assert.equal(cancelled, true);
    assert.equal(confirmed, false);
  });

  it('Confirmar invoca onConfirm y no requiere onCancel', () => {
    let confirmed = false;
    const { handleConfirm } = getConfirmFooterActions({
      onConfirm: () => {
        confirmed = true;
      },
    });

    handleConfirm();
    assert.equal(confirmed, true);
  });

  it('durante isSubmitting no ejecuta Cancelar ni Confirmar', () => {
    let confirmed = false;
    let cancelled = false;
    const actions = getConfirmFooterActions({
      isSubmitting: true,
      onConfirm: () => {
        confirmed = true;
      },
      onCancel: () => {
        cancelled = true;
      },
    });

    actions.handleCancel();
    actions.handleConfirm();

    assert.equal(confirmed, false);
    assert.equal(cancelled, false);
  });

  it('con confirmDisabled no ejecuta Confirmar (p. ej. motivo vacío)', () => {
    let confirmed = false;
    const { handleConfirm } = getConfirmFooterActions({
      confirmDisabled: true,
      onConfirm: () => {
        confirmed = true;
      },
    });
    handleConfirm();
    assert.equal(confirmed, false);
  });
});

describe('confirmConfig variantes', () => {
  it('danger y warning usan estilos distintos (rojo vs ámbar)', () => {
    const danger = getConfirmVariantConfig('danger');
    const warning = getConfirmVariantConfig('warning');
    assert.equal(danger.variant, 'danger');
    assert.equal(warning.variant, 'warning');
    assert.match(danger.confirmButtonClass, /rose-600/);
    assert.match(warning.confirmButtonClass, /amber-600/);
    assert.notEqual(danger.defaultConfirmLabel, warning.defaultConfirmLabel);
  });

  it('variante inválida cae en danger', () => {
    assert.equal(normalizeConfirmVariant('x'), 'danger');
    assert.equal(getConfirmVariantConfig('x').variant, 'danger');
  });
});
