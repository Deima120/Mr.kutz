/**
 * Sistema de avisos estandarizado (toasts, banners, confirmaciones).
 */

export { ToastProvider, useAppToast } from '@/shared/feedback/ToastContext';
export { default as AppToastHost } from '@/shared/feedback/AppToastHost';
export { default as AppInlineAlert } from '@/shared/feedback/AppInlineAlert';
export { default as AdminConfirmModal } from '@/shared/feedback/AdminConfirmModal';
export {
  MAX_VISIBLE_TOASTS,
  getToastDuration,
  pushToast,
  dismissToast,
} from '@/shared/feedback/toastQueue';
export { getConfirmFooterActions } from '@/shared/feedback/confirmActions';
export { getConfirmVariantConfig } from '@/shared/feedback/confirmConfig';
export { VOID_REASON_FIELD_CLASS, VOID_REASON_MAX } from '@/shared/feedback/voidReasonField';
