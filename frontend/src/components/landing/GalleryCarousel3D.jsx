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
    <div className={`w-full max-w-md mx-auto rounded-[1.35rem] p-[1px] bg-gradient-to-br from-gold/70 via-stone-200 to-gold/30 transition-all duration-500 ${isActive ? 'shadow-[0_26px_60px_rgba(0,0,0,0.22)]' : 'shadow-[0_16px_40px_rgba(0,0,0,0.16)]'}`}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative rounded-[1.3rem] overflow-hidden border border-white/70 bg-white"
        style={{
          transform: transform || `perspective(800px) rotateX(0) rotateY(0) scale(${isActive ? 1 : 0.985})`,
          transition: transform ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
        }}
      >
        <div className="aspect-[4/5] relative">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold/90 mb-2">Mr. Kutz Experience</p>
            <h3 className="font-serif text-xl font-medium">{item.title}</h3>
            <p className="text-sm text-stone-200">{item.caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GalleryCarousel3D() {
  return (
    <section id="galeria" className="landing-section bg-gradient-to-b from-stone-100 to-stone-200/80 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-section-pattern opacity-55" />
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-16 -right-12 w-64 h-64 rounded-full bg-stone-400/20 blur-3xl" />
      <div className="container mx-auto px-6 sm:px-8 relative z-10">
        <div className="text-center mb-14 md:mb-16">
          <p className="section-label text-gold">Ambiente</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-stone-900 font-medium tracking-tight mb-4">Nuestro espacio</h2>
          <div className="gold-line mx-auto mb-6" />
          <p className="text-stone-600 max-w-lg mx-auto text-lg">
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
