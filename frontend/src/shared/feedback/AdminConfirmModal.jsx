/**
 * Modal de confirmación unificado sobre AdminModalShell.
 * variant: danger (irreversible) | warning (reversible / con efecto) | neutral
 */

import { Ban, TriangleAlert, HelpCircle } from 'lucide-react';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import { getConfirmFooterActions } from '@/shared/feedback/confirmActions';
import { getConfirmVariantConfig } from '@/shared/feedback/confirmConfig';

const VARIANT_ICON = {
  danger: Ban,
  warning: TriangleAlert,
  neutral: HelpCircle,
};

export default function AdminConfirmModal({
  open,
  title,
  description,
  children,
  variant = 'danger',
  confirmLabel,
  cancelLabel = 'Cancelar',
  submittingLabel = 'Procesando…',
  isSubmitting = false,
  confirmDisabled = false,
  autoFocusConfirm = true,
  onConfirm,
  onCancel,
  showClose = false,
  size = 'sm',
  zIndexClass = 'z-[200]',
}) {
  const config = getConfirmVariantConfig(variant);
  const { handleCancel, handleConfirm } = getConfirmFooterActions({
    onConfirm,
    onCancel,
    isSubmitting,
    confirmDisabled,
  });
  const Icon = VARIANT_ICON[config.variant] || Ban;
  const label = confirmLabel || config.defaultConfirmLabel;

  return (
    <AdminModalShell
      open={open}
      onClose={handleCancel}
      title={title}
      size={size}
      zIndexClass={zIndexClass}
      showClose={showClose}
      preventClose={isSubmitting}
      closeOnBackdrop={!isSubmitting}
      footer={
        <div className="flex gap-2 w-full">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-semibold rounded-xl text-sm border border-stone-200/80"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-autofocus={autoFocusConfirm ? true : undefined}
            disabled={isSubmitting || confirmDisabled}
            onClick={handleConfirm}
            className={config.confirmButtonClass}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {submittingLabel}
              </>
            ) : (
              label
            )}
          </button>
        </div>
      }
    >
      <div className={`h-1 w-full rounded-full bg-gradient-to-r ${config.accentBarClass} mb-4`} aria-hidden />
      <div className={config.iconWrapClass}>
        <Icon className="w-5 h-5" aria-hidden />
      </div>
      {description ? (
        <div className="text-stone-500 text-xs sm:text-sm text-center leading-relaxed mb-3">
          {description}
        </div>
      ) : null}
      {children}
    </AdminModalShell>
  );
}
