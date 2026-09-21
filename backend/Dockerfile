# syntax=docker/dockerfile:1

# =============================================================================
# Mr.Kutz — API REST (Node.js + Express + Prisma)
# =============================================================================
# Imagen multi-etapa: la etapa `deps` instala dependencias y genera el cliente
# de Prisma; la etapa `runtime` se queda solo con lo necesario para ejecutar.
#
# Node 22: el frontend usa Vite 8, que exige "^20.19.0 || >=22.12.0". Aquí se
# mantiene la MISMA línea de Node en los dos paquetes para que no haya dos
# versiones distintas conviviendo en el mismo despliegue. El `engines` del
# package.json dice ">=18", pero eso quedó desactualizado al subir Vite.
# -----------------------------------------------------------------------------

FROM node:22-alpine AS deps

# Prisma elige su motor de consultas según el OpenSSL del sistema. En Alpine hay
# que instalarlo explícitamente o `prisma generate` avisa de que no lo detecta y
# el cliente puede quedar generado para el objetivo equivocado.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./

# El esquema se copia ANTES de instalar: el `postinstall` de este proyecto
# ejecuta `prisma generate`, que falla si todavía no existe prisma/schema.prisma.
COPY prisma ./prisma

# `npm ci` (no `npm install`): instala exactamente lo que fija package-lock.json,
# así la imagen es reproducible. Se instalan también las devDependencies porque
# el CLI de Prisma vive ahí y hace falta en runtime para `prisma migrate deploy`.
RUN npm ci


FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl

ENV NODE_ENV=production
# El código lee `process.env.PORT` con 5000 por defecto; se declara explícito
# para que el puerto publicado y el escuchado no puedan desalinearse.
ENV PORT=5000

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY src ./src
# Los scripts operativos (crear el administrador inicial, auditorías) se incluyen
# para poder ejecutarlos con `docker compose exec` sin reconstruir la imagen.
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && chown -R node:node /app

# Nunca como root: si alguien lograra ejecutar código dentro del contenedor,
# no debería poder tocar el sistema de archivos de la imagen.
USER node

EXPOSE 5000

# El contenedor se considera sano solo si /health responde, y /health consulta la
# base de datos de verdad (SELECT 1). Así docker-compose no da por listo un
# backend que arrancó pero no alcanza PostgreSQL.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget --quiet --spider http://127.0.0.1:5000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
