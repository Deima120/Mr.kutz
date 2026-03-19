/**
 * Galería de cortes — modelo 3D GLTF o imágenes desde public/cortes
 */

import { useState } from 'react';
import Carousel3D from './Carousel3D';
import Model3DGLTF from './Model3DGLTF';
import { CORTES, MODEL_PATH } from '../../config/cortes';

function CorteCard({ item, isActive }) {
  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-card-hover border border-stone-200/80 bg-stone-900">
      <div className="aspect-[4/5] relative">
        <img
          src={item.src}
          alt={item.nombre}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="font-serif text-xl font-medium">{item.nombre}</h3>
          {item.descripcion && (
            <p className="text-sm text-stone-300 mt-1">{item.descripcion}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CortesGallery() {
  const [items] = useState(CORTES);

  // Si hay modelo GLTF configurado, mostrarlo
  if (MODEL_PATH) {
    return <Model3DGLTF url={MODEL_PATH} scale={1.2} />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-12 text-center">
        <p className="text-stone-500 font-medium mb-2">Añade tu contenido</p>
        <p className="text-sm text-stone-400 max-w-md mx-auto mb-4">
          <strong>Opción GLTF (recomendado):</strong> Convierte MAX/3DS a GLB y colócalo en <code className="bg-stone-200 px-1 rounded">public/modelos/</code>. Define <code className="bg-stone-200 px-1 rounded">MODEL_PATH</code> en <code className="bg-stone-200 px-1 rounded">src/config/cortes.js</code>
          <br /><br />
          <strong>Opción imágenes:</strong> Copia PNG a <code className="bg-stone-200 px-1 rounded">public/cortes/</code> y ejecuta <code className="bg-stone-200 px-1 rounded">npm run list-cortes</code>
        </p>
        <p className="text-xs text-stone-400">
          Ver GLTF-README.md para instrucciones de conversión
        </p>
      </div>
    );
  }

  return (
    <Carousel3D
      items={items}
      autoPlayMs={4500}
      showDots
      showArrows
      ariaLabel="Galería de cortes"
      renderSlide={(item, isActive) => <CorteCard item={item} isActive={isActive} />}
    />
  );
}
