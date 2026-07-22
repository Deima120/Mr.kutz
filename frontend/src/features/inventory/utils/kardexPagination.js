/**
 * Paginación del kardex (offset/limit) — pura y testeable sin React.
 */

export const KARDEX_PAGE_SIZE_OPTIONS = [10, 20, 50];
export const KARDEX_DEFAULT_PAGE_SIZE = 20;
export const KARDEX_MAX_PAGE_SIZE = 100;

export function clampKardexPageSize(pageSize, { defaultSize = KARDEX_DEFAULT_PAGE_SIZE, max = KARDEX_MAX_PAGE_SIZE } = {}) {
  const n = parseInt(pageSize, 10);
  if (!Number.isFinite(n) || n < 1) return defaultSize;
  return Math.min(n, max);
}

export function kardexOffset(page, pageSize) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const size = clampKardexPageSize(pageSize);
  return (safePage - 1) * size;
}

export function kardexTotalPages(total, pageSize) {
  const size = clampKardexPageSize(pageSize);
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(1, Math.ceil(n / size));
}

export function clampKardexPage(page, total, pageSize) {
  const totalPages = kardexTotalPages(total, pageSize);
  const raw = parseInt(page, 10) || 1;
  return Math.min(Math.max(1, raw), totalPages);
}
