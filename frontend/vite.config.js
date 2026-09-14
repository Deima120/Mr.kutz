/**
 * Configuración de Vite para el frontend
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // React casi nunca cambia entre despliegues (a diferencia del código de
        // la app, que cambia en cada uno) — separado en su propio chunk, el
        // navegador lo sigue teniendo en caché tras un deploy que no lo toca.
        // Sin esto, el bundler lo fusiona con el bundle principal (visto tras
        // actualizar Vite: pasó de ~68KB a ~256KB) y cualquier cambio de código
        // obliga a redescargar React entero otra vez. Vite 8 usa "rolldown" por
        // debajo, que solo acepta `manualChunks` como función, no como objeto
        // (la forma clásica de Rollup) — de ahí que el chunking haya cambiado
        // justo al actualizar la versión.
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers?.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        },
      },
    },
  },
});
