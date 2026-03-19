/**
 * Configuración de cortes — modelo 3D GLTF o galería de imágenes
 *
 * MODELO 3D (GLTF/GLB) — recomendado:
 * 1. Convierte tu MAX/3DS a GLB (ver GLTF-README.md)
 * 2. Coloca el .glb en frontend/public/modelos/
 * 3. Define modelPath abajo (ej: '/modelos/corte.glb')
 *
 * GALERÍA DE IMÁGENES:
 * 1. Copia PNG a public/cortes/
 * 2. Ejecuta: npm run list-cortes
 * 3. Pega la salida en CORTES
 */

// Ruta al modelo 3D GLB/GLTF (null = usar galería de imágenes)
export const MODEL_PATH = '/modelos/scene.gltf';

export const CORTES = [
  // Ejemplo - reemplaza con tus imágenes:
  // { src: '/cortes/corte1.png', nombre: 'Fade' },
];
