/**
 * Desplegable personalizado Mr. Kutz — portal, variantes admin/formulario/público.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
} from '@/shared/components/admin/AdminFormShell';

const TRIGGER_BASE =
  'flex w-full items-center justify-between gap-2 text-left transition-all duration-200';

const TRIGGER_VARIANT = {
  filter: `select-premium ${TRIGGER_BASE} py-1.5 pl-2.5 pr-2 text-xs min-h-[2rem] rounded-lg font-medium`,
  admin: `select-premium ${TRIGGER_BASE} py-2 pl-3.5 pr-3 text-sm min-h-[2.5rem]`,
  adminCompact: `select-premium ${TRIGGER_BASE} py-1.5 pl-3 pr-2.5 text-xs min-h-[2.125rem]`,
  dark: `select-premium-dark ${TRIGGER_BASE} py-2.5 pl-4 pr-3 text-sm min-h-[2.75rem]`,
  form: `${ADMIN_FORM_FIELD_CLASS} ${TRIGGER_BASE} py-2.5 pr-3 min-h-[2.5rem]`,
  formCompact: `${ADMIN_FORM_FIELD_COMPACT} ${TRIGGER_BASE} pr-3 min-h-[2.25rem]`,
  public: `input-premium ${TRIGGER_BASE} py-3 pl-4 pr-3 text-sm min-h-[2.75rem]`,
};

const PANEL_VARIANT = {
  filter: 'rounded-lg border border-stone-200 bg-white shadow-[0_12px_32px_rgba(28,25,23,0.12)]',
  admin: 'rounded-xl border border-stone-200 bg-white shadow-[0_18px_45px_rgba(28,25,23,0.14)]',
  adminCompact: 'rounded-xl border border-stone-200 bg-white shadow-[0_14px_32px_rgba(28,25,23,0.12)]',
  dark: 'rounded-xl border border-stone-700 bg-stone-950 shadow-[0_22px_55px_rgba(0,0,0,0.5)]',
  form: 'rounded-xl border border-stone-200 bg-white shadow-[0_18px_45px_rgba(28,25,23,0.14)]',
  formCompact: 'rounded-xl border border-stone-200 bg-white shadow-[0_14px_32px_rgba(28,25,23,0.12)]',
  public: 'rounded-xl border border-stone-200 bg-white shadow-[0_18px_45px_rgba(28,25,23,0.14)]',
};

/** Adapta CustomSelect a handlers de formulario que esperan event.target.name/value. */
export function formSelectEvent(name, handler) {
  return (value) => handler({ target: { name, value: String(value ?? '') } });
}

function optionClassName(variant, isSelected, isHighlighted) {
  const base =
    'flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm transition-colors duration-150 rounded-lg mx-1.5';
  const isDark = variant === 'dark';

  if (isDark) {
    if (isSelected) return `${base} bg-gold/15 text-gold font-semibold`;
    if (isHighlighted) return `${base} bg-stone-800 text-stone-100`;
    return `${base} text-stone-300 hover:bg-stone-800/80 hover:text-white`;
  }

  if (isSelected) return `${base} bg-stone-100 text-barber-dark font-semibold ring-1 ring-gold/30`;
  if (isHighlighted) return `${base} bg-stone-50 text-stone-900`;
  return `${base} text-stone-700 hover:bg-stone-50`;
}

function getMenuPosition(triggerEl) {
  if (!triggerEl) return null;

  const rect = triggerEl.getBoundingClientRect();
  const gap = 6;
  const maxHeight = 280;
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  const height = Math.max(120, Math.min(maxHeight, available));

  return {
    left: rect.left,
    width: rect.width,
    maxHeight: height,
    top: openUp ? rect.top - gap - height : rect.bottom + gap,
  };
}

export default function CustomSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar…',
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  disabled = false,
  variant = 'admin',
  className = '',
  selectClassName = '',
  onBlur,
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const onBlurRef = useRef(onBlur);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);

  onBlurRef.current = onBlur;

  const selectedIndex = options.findIndex((opt) => String(opt.id) === String(value));
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const hasValue = value !== undefined && value !== null && String(value) !== '';
  const displayLabel = selectedOption?.label ?? placeholder;

  const triggerClass = TRIGGER_VARIANT[variant] || TRIGGER_VARIANT.admin;
  const panelClass = PANEL_VARIANT[variant] || PANEL_VARIANT.admin;
  const chevronClass =
    variant === 'dark' ? 'text-stone-400 group-hover:text-gold' : 'text-stone-500 group-hover:text-gold';
  const chevronSizeClass = variant === 'filter' || variant === 'adminCompact' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const close = useCallback((shouldBlur = true) => {
    setOpen(false);
    setHighlightIndex(-1);
    setMenuPosition(null);
    if (shouldBlur) onBlurRef.current?.();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const selectOption = useCallback(
    (option) => {
      onChange(option.id);
      close(true);
    },
    [close, onChange]
  );

  const refreshMenuPosition = useCallback(() => {
    setMenuPosition(getMenuPosition(triggerRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;

    refreshMenuPosition();

    const onViewportChange = () => refreshMenuPosition();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, refreshMenuPosition, options.length]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const root = rootRef.current;
      const menu = document.getElementById(listboxId);
      if (root && !root.contains(event.target) && menu && !menu.contains(event.target)) {
        close(true);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close, listboxId, open]);

  useEffect(() => {
    if (open) {
      setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open || highlightIndex < 0) return;
    optionRefs.current[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightIndex]);

  const moveHighlight = (delta) => {
    if (!options.length) return;
    setHighlightIndex((prev) => {
      const start = prev >= 0 ? prev : selectedIndex >= 0 ? selectedIndex : 0;
      return (start + delta + options.length) % options.length;
    });
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled || !options.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const option = options[highlightIndex >= 0 ? highlightIndex : 0];
      if (option) selectOption(option);
    }
  };

  const menu =
    open && menuPosition
      ? createPortal(
          <ul
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
              zIndex: 10050,
            }}
            className={`overflow-y-auto py-1.5 custom-select-panel ${panelClass}`}
          >
            {options.length === 0 ? (
              <li className="px-3.5 py-2 text-sm text-stone-500" role="presentation">
                Sin opciones disponibles
              </li>
            ) : (
              options.map((opt, index) => {
                const isSelected = String(opt.id) === String(value);
                const isHighlighted = index === highlightIndex;

                return (
                  <li key={`${opt.id}-${index}`} role="presentation">
                    <button
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectOption(opt)}
                      className={optionClassName(variant, isSelected, isHighlighted && !isSelected)}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <span className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      {name ? <input type="hidden" name={name} value={hasValue ? String(value) : ''} readOnly /> : null}
      <div ref={rootRef} className={`group relative min-w-0 ${className}`.trim()}>
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          onKeyDown={handleTriggerKeyDown}
          className={`${triggerClass} ${selectClassName} ${
            open ? 'border-gold/50 ring-2 ring-gold/25 bg-white' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`.trim()}
        >
          <span className={`truncate ${!hasValue || !selectedOption ? 'text-stone-400' : ''}`}>
            {displayLabel}
          </span>
          <ChevronDown
            className={`${chevronSizeClass} shrink-0 transition-transform duration-200 ${chevronClass} ${
              open ? 'rotate-180 text-gold' : ''
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>
      {menu}
    </>
  );
}
