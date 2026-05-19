# TODO - Arreglo error MIME type “text/html” para module scripts

- [x] 1) Identificar entorno donde ocurre el error (dev Vite vs producción/hosting).
- [x] 2) Revisar cómo está configurado el hosting (Vercel/rewrites).
- [x] 3) Verificar que el problema es SPA fallback que puede terminar sirviendo HTML en rutas de JS.
- [ ] 4) Ajustar config para evitar que el rewrite a `index.html` afecte requests de bundles (assets/)
- [ ] 5) Rebuild (`npm run build`) y validar que la URL del bundle JS responda con `application/javascript`.

