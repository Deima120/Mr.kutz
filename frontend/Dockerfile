# syntax=docker/dockerfile:1

# =============================================================================
# Mr.Kutz — SPA (React 18 + Vite + Tailwind)
# =============================================================================
# Multi-etapa: se compila con Node y se SIRVE con Nginx. La imagen final no
# lleva Node ni node_modules, solo los archivos estáticos ya compilados, que es
# lo único que un navegador necesita.
# -----------------------------------------------------------------------------

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# Instalación completa (con devDependencies): Vite, Tailwind y PostCSS viven ahí
# y son imprescindibles para compilar.
RUN npm ci

COPY . .

# Vite reemplaza `import.meta.env.VITE_*` en tiempo de COMPILACIÓN, no de
# ejecución: el valor queda escrito dentro del JavaScript final. Por eso es un
# ARG de build y no una variable del contenedor — cambiarlo obliga a reconstruir.
#
# Por defecto "/api", que es una ruta relativa: el navegador la pide al mismo
# origen desde el que cargó la página y Nginx la reenvía al backend (ver
# nginx.conf). Es el mismo montaje que hoy hace vercel.json en producción.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


FROM nginx:1.29-alpine AS runtime

# Reemplaza la configuración por defecto de Nginx: hace falta el fallback de
# SPA (cualquier ruta debe devolver index.html para que React Router la resuelva)
# y el reenvío de /api al backend.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
