/**
 * Galería de cortes — imágenes en public/cortes o URLs (Unsplash, etc.)
 *
 * 1. Opción local: copia PNG/JPG a public/cortes/ y usa src: '/cortes/archivo.jpg'
 * 2. Ejecuta npm run list-cortes para listar archivos y pegarlos en CORTES
 *
 * MODEL_PATH ya no se usa en la landing (antes cargaba un GLTF en un recuadro).
 */

export const MODEL_PATH = null;

export const CORTES = [
  {
    src: 'https://images.unsplash.com/photo-1622287162726-aa62de38d194?w=1200&q=85',
    nombre: 'Manos que marcan estilo',
    descripcion: 'Cada detalle importa en el espejo.',
  },
  {
    src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=85',
    nombre: 'Corte con precisión',
    descripcion: 'Técnica y pulcritud en cada pasada.',
  },
  {
    src: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&q=85',
    nombre: 'Experiencia de barbería',
    descripcion: 'Tradición y ambiente cuidado.',
  },
];
