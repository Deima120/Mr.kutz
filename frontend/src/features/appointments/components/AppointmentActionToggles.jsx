/**
 * Botón deslizante único: Cancelar ← Agendada → Confirmar
 */

import { useRef, useState, useCallback } from 'react';
import { Pencil } from 'lucide-react';

const POS = { cancel: 0, neutral: 1, confirm: 2 };

function basePosition(isConfirmed) {
  return isConfirmed ? POS.confirm : POS.neutral;
}

function ratioToPosition(ratio) {
  if (ratio < 0.33) return POS.cancel;
  if (ratio > 0.66) return POS.confirm;
  return POS.neutral;
}

function AppointmentSlideControl({
  isConfirmed,
  disabled,
  onConfirm,
  onCancel,
}) {
  const trackRef = useRef(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [dragging, setDragging] = useState(false);

  const settled = basePosition(isConfirmed);
  const visual = dragPosition ?? settled;

  const thumbLeft =
    visual === POS.cancel
      ? '0.125rem'
      : visual === POS.confirm
        ? 'calc(100% - 5.625rem - 0.125rem)'
        : 'calc(50% - 2.8125rem)';

  const thumbTone =
    visual === POS.cancel
      ? 'bg-red-600 text-white border-red-600'
      : visual === POS.confirm || isConfirmed
        ? 'bg-emerald-600 text-white border-emerald-600'
        : 'bg-white text-stone-700 border-stone-200/90';

  const thumbLabel =
    visual === POS.cancel
      ? 'Cancelar'
      : visual === POS.confirm || isConfirmed
        ? 'Confirmada'
        : 'Agendada';

  const resolveFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect?.width) return settled;
    const ratio = (clientX - rect.left) / rect.width;
    return ratioToPosition(ratio);
  }, [settled]);

  const commitPosition = useCallback(
    (next) => {
      if (disabled) return;
      if (next === POS.cancel && next !== settled) {
        onCancel();
        return;
      }
      if (next === POS.confirm && !isConfirmed) {
        onConfirm();
      }
    },
    [disabled, settled, isConfirmed, onCancel, onConfirm]
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
      aria-label="Desliza para confirmar o cancelar la cita"
      onClick={handleTrackClick}
      className={`relative h-9 w-[11.25rem] rounded-full bg-stone-200/90 p-0.5 select-none touch-none ${
        disabled ? 'opacity-45 pointer-events-none' : 'cursor-pointer'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2.5">
        <span className="text-[10px] font-semibold text-stone-500">Cancelar</span>
        <span className="text-[10px] font-semibold text-stone-500">Confirmar</span>
      </div>

      <button
        type="button"
        data-slide-thumb
        role="slider"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={visual}
        aria-label={thumbLabel}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerUp}
        onPointerCancel={handleThumbPointerUp}
        className={`absolute top-0.5 z-10 flex h-8 w-[5.625rem] items-center justify-center rounded-full border text-[10px] font-bold shadow-md transition-[left,background-color,color] duration-200 ease-out ${thumbTone} ${
          dragging ? 'transition-none scale-[1.02]' : ''
        }`}
        style={{ left: thumbLeft }}
      >
        {thumbLabel}
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
    <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
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
          onCancel={() => onCancelRequest(appointmentId)}
        />
      )}
    </div>
  );
}
