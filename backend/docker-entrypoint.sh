#!/bin/sh
# Arranque del contenedor del backend.
#
# Las migraciones se aplican AQUÍ y no en el `docker build` por un motivo
# concreto: durante la construcción de la imagen no existe todavía ninguna base
# de datos a la que conectarse (el servicio `db` de docker-compose aún no
# arrancó). En Render sí van en el build porque allí la base ya existe.
#
# `prisma migrate deploy` solo aplica las migraciones pendientes y no genera
# ninguna nueva: es la orden pensada para entornos no interactivos. Nunca borra
# datos ni reescribe el historial.
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Aplicando migraciones pendientes..."
  npx prisma migrate deploy
else
  echo "[entrypoint] RUN_MIGRATIONS=false — se omiten las migraciones."
fi

# `exec` reemplaza este shell por el proceso de Node, de modo que Node sea el
# PID 1 y reciba SIGTERM directamente. El servidor ya implementa cierre ordenado
# (src/index.js: gracefulShutdown), y sin `exec` esa señal se quedaría en el
# shell y las peticiones en vuelo se cortarían a la mitad.
echo "[entrypoint] Iniciando la API..."
exec "$@"
