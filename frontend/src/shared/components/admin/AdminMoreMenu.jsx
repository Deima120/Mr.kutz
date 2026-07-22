/**
 * Menú «Más» para acciones secundarias en filas de tablas admin.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';

export default function AdminMoreMenu({
  label = 'Más acciones',
  items = [],
  disabled = false,
}) {
  const menuId = useId();
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const visibleItems = items.filter((item) => item && !item.hidden);

  useEffect(() => {
    if (!open) return undefined;

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 200;
      const left = Math.min(rect.right - width, window.innerWidth - width - 8);
      const openUp = window.innerHeight - rect.bottom < 180 && rect.top > 180;
      setPos({
        left: Math.max(8, left),
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        width,
      });
    };

    update();
    const onPointer = (event) => {
      const menu = document.getElementById(menuId);
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        menu &&
        !menu.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menuId]);

  if (visibleItems.length === 0) return null;

  const menu =
    open && pos
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              zIndex: 10060,
            }}
            className="rounded-xl border border-stone-200 bg-white py-1.5 shadow-[0_14px_32px_rgba(28,25,23,0.14)]"
          >
            {visibleItems.map((item) => (
              <button
                key={item.id || item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                  item.danger
                    ? 'text-red-700 hover:bg-red-50'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {item.icon ? <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        <AdminIconButton
          icon={MoreHorizontal}
          label={label}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
        />
      </span>
      {menu}
    </>
  );
}
