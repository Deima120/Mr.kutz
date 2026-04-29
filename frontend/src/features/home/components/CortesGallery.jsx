/**
 * Galería destacada — imagen editorial de barbería (sin visor 3D)
 */

import { useState } from 'react';

import { CORTES } from '@/shared/utils/cortes';

export default function CortesGallery() {
  const [items] = useState(CORTES);
  const [active, setActive] = useState(0);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-600/60 bg-stone-900/40 p-10 sm:p-12 text-center">
        <p className="text-stone-200 font-medium mb-2">Añade imágenes de tus cortes</p>
        <p className="text-sm text-stone-400 max-w-md mx-auto">
          Coloca JPG o PNG en <code className="bg-stone-800 px-1.5 py-0.5 rounded text-gold/90">public/cortes/</code> y
          actualiza el array <code className="bg-stone-800 px-1.5 py-0.5 rounded">CORTES</code> en{' '}
          <code className="bg-stone-800 px-1.5 py-0.5 rounded">src/shared/utils/cortes.js</code>. Puedes ejecutar{' '}
          <code className="bg-stone-800 px-1.5 py-0.5 rounded">npm run list-cortes</code> para ver rutas listas.
        </p>
      </div>
    );
  }

  const current = items[active];

  return (
    <div className="relative w-full max-w-6xl mx-auto mt-6">
      {/* Glow y capas de profundidad */}
      <div className="pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full bg-gold/25 blur-[80px]" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-amber-600/10 blur-[60px]" aria-hidden />

      <div className="relative grid gap-8 lg:grid-cols-12 lg:gap-10 lg:items-center">
        {/* Columna imagen — marco asimétrico y máscara editorial */}
        <div className="relative lg:col-span-7">
          <div
            className="absolute -inset-1 rounded-[1.65rem] bg-gradient-to-br from-gold/50 via-stone-400/30 to-gold/40 opacity-90 blur-sm"
            aria-hidden
          />
          <div
            className="relative overflow-hidden rounded-3xl border border-gold/35 bg-stone-950 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 96%, 3% 100%, 0 92%)' }}
          >
            <div className="relative aspect-[4/5] sm:aspect-[5/6] md:aspect-[16/11] w-full">
              <img
                key={current.src}
                src={current.src}
                alt={current.nombre}
                className="h-full w-full object-cover object-center transition duration-500 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/50" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
              {/* Línea diagonal decorativa */}
              <div
                className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-gold/15 to-transparent"
                aria-hidden
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-left text-white">
                <p className="mb-2 text-[10px] font-semibold tracking-[0.35em] text-gold">En la silla</p>
                <h3 className="font-serif text-2xl font-medium sm:text-3xl md:text-4xl leading-tight">{current.nombre}</h3>
                {current.descripcion && (
                  <p className="mt-2 max-w-md text-sm text-stone-300 sm:text-base">{current.descripcion}</p>
                )}
              </div>
            </div>
          </div>
          {/* Esquina tipo “sello” */}
          <div
            className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 rounded-br-3xl border-r-2 border-b-2 border-gold/70 sm:h-28 sm:w-28"
            aria-hidden
          />
        </div>

        {/* Columna texto + miniaturas */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold">Arte y oficio</p>
          <h4 className="mt-3 font-serif text-2xl font-medium text-white sm:text-3xl leading-snug">
            Donde el corte deja de ser rutina
          </h4>
          <p className="mt-4 text-stone-400 text-sm sm:text-base leading-relaxed">
            Inspiración real: barberos al trabajo, foco en el gesto y el resultado. Elige otra toma para ver el ambiente.
          </p>

          {items.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {items.map((item, i) => (
                <button
                  key={item.src}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 sm:h-[4.5rem] sm:w-[4.5rem] ${
                    i === active
                      ? 'border-gold ring-2 ring-gold/40 scale-105'
                      : 'border-stone-600 opacity-80 hover:border-stone-400 hover:opacity-100'
                  }`}
                  aria-label={`Ver imagen ${i + 1}: ${item.nombre}`}
                  aria-current={i === active ? 'true' : undefined}
                >
                  <img src={item.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <span
                    className={`absolute inset-0 bg-gold/0 transition-colors ${i === active ? 'bg-gold/10' : 'group-hover:bg-white/10'}`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
