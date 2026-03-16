/**
 * Carrusel con efecto 3D (perspectiva y profundidad)
 * Sin dependencias externas — CSS transforms + React state
 */

import { useState, useEffect } from 'react';

export default function Carousel3D({
  items,
  autoPlayMs = 0,
  showDots = true,
  showArrows = true,
  className = '',
  renderSlide,
  ariaLabel = 'Carrusel',
}) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0); // -1 prev, 1 next
  const total = items.length;

  const goTo = (index, dir = 1) => {
    if (total <= 1) return;
    setDirection(dir);
    setCurrent((prev) => (index + total) % total);
  };

  useEffect(() => {
    if (autoPlayMs <= 0 || total <= 1) return;
    const t = setInterval(() => goTo(current + 1, 1), autoPlayMs);
    return () => clearInterval(t);
  }, [autoPlayMs, current, total]);

  return (
    <div className={`relative ${className}`} role="region" aria-label={ariaLabel}>
      {/* Contenedor con perspectiva 3D */}
      <div
        className="relative w-full overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        <div className="relative flex items-center justify-center min-h-[280px] sm:min-h-[360px] md:min-h-[420px]">
          {items.map((item, i) => {
            const isActive = i === current;
            const offset = i - current;
            const absOffset = Math.abs(offset);
            if (absOffset > 2) return null; // Solo renderizar slides cercanos para rendimiento

            return (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
                style={{
                  transform: `translateX(${offset * 100}%) translateZ(${-Math.abs(offset) * 80}px) scale(${1 - absOffset * 0.15})`,
                  opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.7 : 0.3,
                  zIndex: 10 - absOffset,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div
                  className="w-full max-w-4xl mx-auto px-4 transition-transform duration-500"
                  style={{
                    transform: `rotateY(${direction * (isActive ? 0 : 5)}deg)`,
                  }}
                >
                  {renderSlide(item, isActive)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showArrows && total > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(current - 1, -1)}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Anterior"
          >
            <span className="text-xl font-bold">‹</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1, 1)}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Siguiente"
          >
            <span className="text-xl font-bold">›</span>
          </button>
        </>
      )}

      {showDots && total > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > current ? 1 : -1)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-gold' : 'w-2 bg-stone-400 hover:bg-stone-500'
              }`}
              aria-label={`Ir a slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
