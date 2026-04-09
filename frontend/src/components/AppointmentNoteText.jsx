/**
 * Nota de cita: texto largo truncado; al pasar el cursor sobre la nota se muestra
 * el texto completo en un recuadro al lado (portal + posición fija).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PANEL_MAX_W = 320;
const GAP = 8;
const HIDE_DELAY_MS = 120;

function computePanelPosition(anchorRect) {
  const vw = window.innerWidth;
  const panelW = Math.min(PANEL_MAX_W, vw - 16);
  let left = anchorRect.right + GAP;
  if (left + panelW > vw - 8) {
    left = anchorRect.left - GAP - panelW;
  }
  if (left < 8) left = 8;

  const top = anchorRect.top;
  return { top, left, width: panelW };
}

/**
 * @param {{ fullText: string, anchorRef: React.RefObject<HTMLElement|null>, open: boolean, onMouseEnter: () => void, onMouseLeave: () => void }} props
 */
function NoteFullPreviewPortal({ fullText, anchorRef, open, onMouseEnter, onMouseLeave }) {
  const [style, setStyle] = useState({ top: 0, left: 0, width: PANEL_MAX_W });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setStyle(computePanelPosition(el.getBoundingClientRect()));
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onMouseLeave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onMouseLeave]);

  if (!open) return null;

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[10000] rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-xl whitespace-pre-wrap break-words max-h-[min(70vh,420px)] overflow-y-auto pointer-events-auto"
      style={{ top: style.top, left: style.left, width: style.width }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {fullText}
    </div>,
    document.body
  );
}

function useHoverPreview() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const hideTimer = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const hideNow = useCallback(() => {
    clearHideTimer();
    setOpen(false);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return { open, anchorRef, show, scheduleHide, hideNow, keepOpen: clearHideTimer };
}

function splitTruncated(text, maxLength) {
  const t = String(text).trim();
  const needsEllipsis = t.length > maxLength;
  let visible = needsEllipsis ? t.slice(0, maxLength) : t;
  if (needsEllipsis) {
    const lastSpace = visible.lastIndexOf(' ');
    const lastNl = visible.lastIndexOf('\n');
    const breakAt = Math.max(lastSpace, lastNl);
    if (breakAt > Math.floor(maxLength * 0.55)) {
      visible = visible.slice(0, breakAt);
    }
    visible = visible.trimEnd();
    if (!visible) visible = t.slice(0, maxLength).trimEnd();
  }
  return { fullText: t, visible, needsEllipsis };
}

/**
 * Fragmento inline: prefijo visible + "…"; hover sobre el conjunto abre el recuadro.
 */
export function AppointmentNoteEllipsis({ text, maxLength = 120, className = '' }) {
  const hover = useHoverPreview();
  const t = text == null || text === '' ? '' : String(text).trim();
  if (!t) return null;

  const { fullText, visible, needsEllipsis } = splitTruncated(t, maxLength);
  const { open, anchorRef, show, scheduleHide, hideNow, keepOpen } = hover;

  if (!needsEllipsis) {
    return <span className={`whitespace-pre-wrap break-words ${className}`.trim()}>{visible}</span>;
  }

  return (
    <>
      <span
        ref={anchorRef}
        className={`inline cursor-help whitespace-pre-wrap break-words ${className}`.trim()}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {visible}
        <span className="text-stone-500 font-semibold select-none">…</span>
      </span>
      <NoteFullPreviewPortal
        fullText={fullText}
        anchorRef={anchorRef}
        open={open}
        onMouseEnter={keepOpen}
        onMouseLeave={hideNow}
      />
    </>
  );
}

/**
 * Bloque con etiqueta "Nota:" (o la que indiques). Hover incluye etiqueta + texto truncado.
 */
export function AppointmentNoteBlock({
  text,
  maxLength = 160,
  label = 'Nota',
  labelClassName = 'font-semibold text-stone-800',
  className = '',
  as: Tag = 'p',
}) {
  const hover = useHoverPreview();
  const t = text == null || text === '' ? '' : String(text).trim();
  if (!t) return null;

  const { fullText, visible, needsEllipsis } = splitTruncated(t, maxLength);
  const { open, anchorRef, show, scheduleHide, hideNow, keepOpen } = hover;

  if (!needsEllipsis) {
    return (
      <Tag className={className}>
        {label ? <span className={labelClassName}>{label}: </span> : null}
        <span className="whitespace-pre-wrap break-words">{visible}</span>
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      <span
        ref={anchorRef}
        className="inline cursor-help"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {label ? <span className={labelClassName}>{label}: </span> : null}
        <span className="whitespace-pre-wrap break-words">
          {visible}
          <span className="text-stone-500 font-semibold select-none">…</span>
        </span>
      </span>
      <NoteFullPreviewPortal
        fullText={fullText}
        anchorRef={anchorRef}
        open={open}
        onMouseEnter={keepOpen}
        onMouseLeave={hideNow}
      />
    </Tag>
  );
}
