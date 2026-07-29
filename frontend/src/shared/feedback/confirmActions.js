/**
 * Contrato de acciones del modal de confirmación.
 * Cancelar nunca debe ejecutar onConfirm; durante isSubmitting no se dispara nada.
 */

/**
 * @param {{ onConfirm?: () => void, onCancel?: () => void, isSubmitting?: boolean, confirmDisabled?: boolean }} opts
 */
export function getConfirmFooterActions({
  onConfirm,
  onCancel,
  isSubmitting = false,
  confirmDisabled = false,
} = {}) {
  return {
    handleCancel() {
      if (isSubmitting) return;
      onCancel?.();
    },
    handleConfirm() {
      if (isSubmitting || confirmDisabled) return;
      onConfirm?.();
    },
  };
}
