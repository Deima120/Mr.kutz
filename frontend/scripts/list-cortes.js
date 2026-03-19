/**
 * Script para generar la lista de cortes desde public/cortes/
 * Ejecutar: node scripts/list-cortes.js
 * Copia la salida en src/config/cortes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cortesDir = path.join(__dirname, '../public/cortes');

if (!fs.existsSync(cortesDir)) {
  console.log('Carpeta public/cortes no existe. Créala y añade tus PNG/JPG.');
  process.exit(1);
}

const files = fs.readdirSync(cortesDir)
  .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.log('No hay imágenes PNG/JPG en public/cortes. Añade tus archivos.');
  process.exit(1);
}

const items = files.map((f, i) => {
  const base = path.basename(f, path.extname(f));
  const nombre = base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `  { src: '/cortes/${f}', nombre: '${nombre}' },`;
});

console.log('// Copia esto en src/config/cortes.js o en el array CORTES del componente:\n');
console.log('export const CORTES = [');
console.log(items.join('\n'));
console.log('];');
console.log(`\n// Total: ${files.length} imágenes`);
