/**
 * Selector de producto con búsqueda remota y alta inline (ProductCreateModal).
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import * as productService from '@/features/inventory/services/productService';
import ProductCreateModal from '@/features/inventory/components/ProductCreateModal';
import { ADMIN_FORM_FIELD_COMPACT } from '@/shared/components/admin/AdminFormShell';

const SEARCH_DEBOUNCE_MS = 280;
const SEARCH_LIMIT = 30;

function productLabel(product) {
  if (!product) return '';
  return `${product.name}${product.sku ? ` · ${product.sku}` : ''}`;
}

function getMenuPosition(triggerEl) {
  if (!triggerEl) return null;
  const rect = triggerEl.getBoundingClientRect();
  const gap = 6;
  const maxHeight = 300;
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  const height = Math.max(140, Math.min(maxHeight, available));
  return {
    left: rect.left,
    width: Math.max(rect.width, 260),
    maxHeight: height,
    top: openUp ? rect.top - gap - height : rect.bottom + gap,
  };
}

/**
 * @param {string|number} value productId
 * @param {(productId: string, product: object|null) => void} onChange
 */
export default function ProductPicker({
  value,
  onChange,
  onBlur,
  placeholder = 'Buscar producto…',
  selectClassName = '',
  disabled = false,
  allowCreate = true,
  ariaInvalid,
  ariaDescribedBy,
}) {
  const selectId = useId();
  const listboxId = `${selectId}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  useEffect(() => {
    if (!value) {
      setSelectedProduct(null);
      return undefined;
    }

    let cancelled = false;
    let skipFetch = false;
    setSelectedProduct((current) => {
      if (current && String(current.id) === String(value)) {
        skipFetch = true;
        return current;
      }
      return current;
    });
    if (skipFetch) return undefined;

    productService
      .getProductById(value)
      .then((res) => {
        if (cancelled) return;
        setSelectedProduct(res?.data ?? res);
      })
      .catch(() => {
        if (!cancelled) setSelectedProduct(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const q = query.trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      productService
        .getProducts({
          search: q || undefined,
          active: 'true',
          limit: SEARCH_LIMIT,
          offset: 0,
        })
        .then((result) => {
          if (cancelled) return;
          setResults(Array.isArray(result?.data) ? result.data : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const close = useCallback((shouldBlur = true) => {
    setOpen(false);
    setMenuPosition(null);
    setHighlightIndex(0);
    if (shouldBlur) onBlurRef.current?.();
  }, []);

  const selectProduct = useCallback(
    (product) => {
      setSelectedProduct(product);
      onChange?.(String(product.id), product);
      setQuery('');
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
  }, [open, refreshMenuPosition, results.length]);

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
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const createActionIndex = allowCreate ? results.length : -1;
  const totalOptions = results.length + (allowCreate ? 1 : 0);

  const openCreate = (nameHint) => {
    setCreateName(String(nameHint || query || '').trim());
    setCreateOpen(true);
    close(false);
  };

  const handleCreated = (product) => {
    if (!product?.id) return;
    setSelectedProduct(product);
    onChange?.(String(product.id), product);
    setQuery('');
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!totalOptions) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightIndex((prev) => (prev + delta + totalOptions) % totalOptions);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (allowCreate && highlightIndex === createActionIndex) {
        openCreate(query);
        return;
      }
      const product = results[highlightIndex];
      if (product) selectProduct(product);
    }
  };

  const displayLabel = selectedProduct ? productLabel(selectedProduct) : placeholder;
  const hasValue = value !== undefined && value !== null && String(value) !== '';

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            id={listboxId}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
              zIndex: 10050,
            }}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_14px_32px_rgba(28,25,23,0.12)] flex flex-col"
          >
            <div className="p-2 border-b border-stone-100 shrink-0">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlightIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe para buscar…"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/80 py-1.5 pl-8 pr-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                />
              </div>
            </div>
            <ul className="overflow-y-auto py-1.5 flex-1 min-h-0" role="presentation">
              {loading ? (
                <li className="px-3.5 py-2 text-sm text-stone-500">Buscando…</li>
              ) : results.length === 0 ? (
                <li className="px-3.5 py-2 text-sm text-stone-500">
                  {query.trim() ? 'Sin resultados' : 'Escribe para buscar productos'}
                </li>
              ) : (
                results.map((product, index) => {
                  const isSelected = String(product.id) === String(value);
                  const isHighlighted = index === highlightIndex;
                  return (
                    <li key={product.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        onMouseEnter={() => setHighlightIndex(index)}
                        onClick={() => selectProduct(product)}
                        className={`flex w-full items-center justify-between gap-3 mx-1.5 rounded-lg px-3.5 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-stone-100 text-barber-dark font-semibold ring-1 ring-gold/30'
                            : isHighlighted
                              ? 'bg-stone-50 text-stone-900'
                              : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span className="truncate min-w-0">
                          <span className="block truncate">{product.name}</span>
                          {product.sku ? (
                            <span className="block text-[11px] text-stone-500 truncate">{product.sku}</span>
                          ) : null}
                        </span>
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {allowCreate ? (
              <div className="border-t border-stone-100 p-1.5 shrink-0">
                <button
                  type="button"
                  role="option"
                  aria-selected={highlightIndex === createActionIndex}
                  onMouseEnter={() => setHighlightIndex(createActionIndex)}
                  onClick={() => openCreate(query)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    highlightIndex === createActionIndex
                      ? 'bg-gold/10 text-barber-dark'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Plus className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  <span className="truncate">
                    {query.trim()
                      ? `Crear «${query.trim()}»`
                      : 'Crear producto nuevo'}
                  </span>
                </button>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div ref={rootRef} className="group relative min-w-0">
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          className={`${ADMIN_FORM_FIELD_COMPACT} flex w-full items-center justify-between gap-2 text-left pr-3 min-h-[2.25rem] ${selectClassName} ${
            open ? 'border-gold/50 ring-2 ring-gold/25 bg-white' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`.trim()}
        >
          <span className={`truncate ${!hasValue || !selectedProduct ? 'text-stone-400' : ''}`}>
            {displayLabel}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-stone-500 transition-transform duration-200 ${
              open ? 'rotate-180 text-gold' : ''
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>
      {menu}
      <ProductCreateModal
        open={createOpen}
        initialName={createName}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
