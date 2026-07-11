/**
 * Control deslizante: Cancelar ← Agendada → Confirmar
 */

import { useRef, useState, useCallback } from 'react';
import { Pencil, X, Check } from 'lucide-react';

const POS = { cancel: 0, neutral: 1, confirm: 2 };
const THUMB_W = '5.25rem';

function basePosition(isConfirmed) {
  return isConfirmed ? POS.confirm : POS.neutral;
}

function ratioToPosition(ratio) {
  if (ratio < 0.34) return POS.cancel;
  if (ratio > 0.66) return POS.confirm;
  return POS.neutral;
}

function AppointmentSlideControl({ isConfirmed, disabled, onConfirm, onCancel, onUnconfirm }) {
  const trackRef = useRef(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [dragging, setDragging] = useState(false);

  const settled = basePosition(isConfirmed);
  const visual = dragPosition ?? settled;

  const thumbLeft =
    visual === POS.cancel
      ? '2px'
      : visual === POS.confirm
        ? `calc(100% - ${THUMB_W} - 2px)`
        : `calc(50% - (${THUMB_W} / 2))`;

  const thumbClass =
    visual === POS.cancel
      ? 'bg-red-600 text-white border-red-700/10'
      : visual === POS.confirm || isConfirmed
        ? 'bg-emerald-600 text-white border-emerald-700/10'
        : 'bg-white text-stone-800 border-stone-200/90 shadow-sm';

  const label =
    visual === POS.cancel
      ? 'Cancelar'
      : visual === POS.confirm || isConfirmed
        ? 'Confirmar'
        : 'Agendada';

  const resolveFromClientX = useCallback(
    (clientX) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect?.width) return settled;
      return ratioToPosition((clientX - rect.left) / rect.width);
    },
    [settled]
  );

  const commitPosition = useCallback(
    (next) => {
      if (disabled) return;
      if (next === POS.cancel && next !== settled) {
        onCancel();
        return;
      }
      if (next === POS.confirm && !isConfirmed) {
        onConfirm();
        return;
      }
      if (next === POS.neutral && isConfirmed) {
        onUnconfirm?.();
      }
    },
    [disabled, settled, isConfirmed, onCancel, onConfirm, onUnconfirm]
  );

  const handleTrackClick = (e) => {
    if (disabled || dragging) return;
    if (e.target.closest('[data-slide-thumb]')) return;
    commitPosition(resolveFromClientX(e.clientX));
  };

  const handleThumbPointerDown = (e) => {
    if (disabled) return;
    e.stopPropagation();
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleThumbPointerMove = (e) => {
    if (!dragging || disabled) return;
    setDragPosition(resolveFromClientX(e.clientX));
  };

  const handleThumbPointerUp = (e) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    const next = dragPosition ?? settled;
    setDragPosition(null);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    commitPosition(next);
  };

  return (
    <div
      ref={trackRef}
      role="group"
      aria-label="Desliza para confirmar o cancelar"
      onClick={handleTrackClick}
      className={`relative h-9 w-[11.25rem] shrink-0 rounded-full bg-stone-200/85 p-0.5 select-none touch-none ${
        disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
      }`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center">
        <X
          className={`w-3.5 h-3.5 text-red-500/75 transition-opacity duration-200 ${
            visual === POS.cancel ? 'opacity-0' : 'opacity-100'
          }`}
          strokeWidth={2.25}
          aria-hidden
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center">
        <Check
          className={`w-3.5 h-3.5 text-emerald-600/75 transition-opacity duration-200 ${
            visual === POS.confirm ? 'opacity-0' : 'opacity-100'
          }`}
          strokeWidth={2.25}
          aria-hidden
        />
      </div>

      <button
        type="button"
        data-slide-thumb
        role="slider"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={visual}
        aria-label={label}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
        onPointerCancel={handleThumbPointerUp}
        className={`absolute top-0.5 z-10 flex h-8 w-[5.25rem] items-center justify-center rounded-full border text-[10px] font-bold tracking-tight ${thumbClass} ${
          dragging
            ? 'transition-none scale-[1.03]'
            : 'transition-[left,background-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
        }`}
        style={{ left: thumbLeft }}
      >
        {label}
      </button>
    </div>
  );
}

export default function AppointmentActionToggles({
  appointmentId,
  status,
  canConfirm,
  canCancel,
  onEdit,
  onConfirmChange,
  onCancelRequest,
  editDisabled = false,
}) {
  const isConfirmed = status === 'confirmed';
  const showDecision = canConfirm || canCancel;
  const slideDisabled = !canConfirm && !canCancel;

  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      {!editDisabled && (
        <button
          type="button"
          onClick={() => onEdit(appointmentId)}
          className="inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm transition-colors hover:border-gold/50 hover:bg-gold/5 hover:text-gold-dark"
          aria-label="Editar cita"
          title="Editar cita"
        >
          <Pencil className="w-4 h-4" strokeWidth={2} aria-hidden />
        </button>
      )}

      {showDecision && (
        <AppointmentSlideControl
          isConfirmed={isConfirmed}
          disabled={slideDisabled}
          onConfirm={() => onConfirmChange(appointmentId, true)}
          onUnconfirm={() => onConfirmChange(appointmentId, false)}
          onCancel={() => onCancelRequest(appointmentId)}
        />
      )}
    </div>
  );
}
