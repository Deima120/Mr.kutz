/**
 * Posición y ancho del panel de CustomSelect (puro, testeable).
 */

export const CUSTOM_SELECT_PANEL_MIN_WIDTH = 260;
export const CUSTOM_SELECT_PANEL_MAX_WIDTH = 448; // 28rem

/**
 * Resuelve aliases de variantes antiguas → canónicas.
 * Canónicas: filter | form | public | dark
 */
export function resolveSelectVariant(variant) {
  const map = {
    filter: 'filter',
    form: 'form',
    public: 'public',
    dark: 'dark',
    // aliases
    admin: 'form',
    adminCompact: 'form',
    formCompact: 'form',
  };
  return map[variant] || 'form';
}

/**
 * @param {DOMRect} rect
 * @param {{ viewportWidth?: number, viewportHeight?: number, gap?: number, maxHeight?: number, minWidth?: number, maxWidth?: number }} [opts]
 */
export function getMenuPositionFromRect(rect, opts = {}) {
  const viewportWidth = opts.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1024);
  const viewportHeight = opts.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 768);
  const gap = opts.gap ?? 6;
  const maxHeight = opts.maxHeight ?? 280;
  const minWidth = opts.minWidth ?? CUSTOM_SELECT_PANEL_MIN_WIDTH;
  const maxWidth = opts.maxWidth ?? CUSTOM_SELECT_PANEL_MAX_WIDTH;

  const spaceBelow = viewportHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openUp = spaceBelow < 100 && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : Math.max(spaceBelow, 140);
  const height = Math.min(maxHeight, available);

  const edgePad = 8;
  const preferredWidth = Math.min(Math.max(rect.width, minWidth), maxWidth, viewportWidth - edgePad * 2);
  let left = rect.left;
  if (left + preferredWidth > viewportWidth - edgePad) {
    left = Math.max(edgePad, viewportWidth - edgePad - preferredWidth);
  }
  if (left < edgePad) left = edgePad;

  if (openUp) {
    return {
      left,
      width: preferredWidth,
      maxHeight: height,
      top: 'auto',
      bottom: viewportHeight - rect.top + gap,
    };
  }

  return {
    left,
    width: preferredWidth,
    maxHeight: height,
    top: rect.bottom + gap,
    bottom: 'auto',
  };
}
