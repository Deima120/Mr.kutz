/**
 * Galería con carrusel 3D — tarjetas con perspectiva y tilt
 * Imágenes de ambiente de barbería
 */

import { useState, useRef } from 'react';
import Carousel3D from './Carousel3D';

const GALLERY_ITEMS = [
  {
    image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80',
    title: 'Silla clásica',
    caption: 'Comodidad y tradición',
  },
  {
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80',
    title: 'Nuestro espacio',
    caption: 'Ambiente único',
  },
  {
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80',
    title: 'Detalle profesional',
    caption: 'Precisión en cada corte',
  },
  {
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80',
    title: 'Herramientas',
    caption: 'Calidad de trabajo',
  },
  {
    image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80',
    title: 'Experiencia',
    caption: 'Tu momento',
  },
];

function GalleryCard({ item, isActive }) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = Math.max(-15, Math.min(15, -y * 12));
    const rotateY = Math.max(-15, Math.min(15, x * 12));
    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => setTransform('');

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-card-hover border border-stone-200/80"
      style={{
        transform: transform || 'perspective(800px) rotateX(0) rotateY(0)',
        transition: transform ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
      }}
    >
      <div className="aspect-[4/5] relative">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="font-serif text-xl font-medium">{item.title}</h3>
          <p className="text-sm text-stone-300">{item.caption}</p>
        </div>
      </div>
    </div>
  );
}

export default function GalleryCarousel3D() {
  return (
    <section id="galeria" className="landing-section bg-stone-100 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-section-pattern opacity-70" />
      <div className="container mx-auto px-6 sm:px-8 relative z-10">
        <div className="text-center mb-14 md:mb-16">
          <p className="section-label text-gold">Ambiente</p>
          <h2 className="section-heading mb-4">Nuestro espacio</h2>
          <div className="gold-line mx-auto mb-6" />
          <p className="text-stone-500 max-w-lg mx-auto text-lg">
            Conoce el lugar donde la tradición y el estilo se encuentran.
          </p>
        </div>
        <Carousel3D
          items={GALLERY_ITEMS}
          autoPlayMs={4500}
          showDots
          showArrows
          ariaLabel="Galería del espacio"
          renderSlide={(item, isActive) => <GalleryCard item={item} isActive={isActive} />}
        />
      </div>
    </section>
  );
}
