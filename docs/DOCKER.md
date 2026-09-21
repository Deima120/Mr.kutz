# Dockerización de Mr.Kutz

Guía para levantar el sistema completo (base de datos, API y aplicación web) en
contenedores, con un solo comando y sin instalar PostgreSQL ni Node en el equipo.

---

## 1. Qué se levanta

| Servicio   | Imagen base       | Qué hace                                   | Puerto en tu equipo |
|------------|-------------------|--------------------------------------------|---------------------|
| `db`       | `postgres:16-alpine` | Base de datos PostgreSQL                | `5433`              |
| `backend`  | `node:22-alpine`  | API REST (Express + Prisma)                | `5000`              |
| `frontend` | `nginx:1.29-alpine` | Aplicación web ya compilada              | `8080`              |

Los tres viven en una red privada que crea Docker, donde se llaman entre sí por
el nombre del servicio (`db`, `backend`). Solo los puertos de la tabla quedan
publicados hacia tu equipo.

```
Navegador  →  localhost:8080  →  [ frontend / Nginx ]
                                        │
                                        ├── /            → archivos estáticos (React)
                                        └── /api/*       → [ backend / Node ] → [ db / PostgreSQL ]
```

---

## 2. Cómo levantarlo

Requisito: **Docker Desktop instalado y en ejecución**.

```bash
# 1. Crear el archivo de variables (una sola vez)
cp .env.docker.example .env

# 2. Editar .env y poner una contraseña y un JWT_SECRET propios

# 3. Construir y arrancar
docker compose up -d --build
```

La primera vez tarda unos minutos porque descarga las imágenes base y compila el
frontend. Cuando termine:

- Aplicación: <http://localhost:8080>
- API: <http://localhost:5000/api>
- Estado del sistema: <http://localhost:8080/health>

### Datos iniciales

La base arranca vacía. Para cargar el catálogo básico (roles, permisos, métodos
de pago, servicios) y crear el administrador:

```bash
# Catálogo base — se puede repetir sin duplicar nada (usa upsert)
docker compose exec backend npm run db:seed

# Usuario administrador
docker compose exec -e ADMIN_EMAIL=admin@mrkutz.com -e ADMIN_PASSWORD=UnaClaveSegura1 backend npm run create-admin
```

---

## 3. Comandos del día a día

```bash
docker compose ps                    # estado de los tres servicios
docker compose logs -f backend       # ver los registros de la API en vivo
docker compose restart backend       # reiniciar solo la API
docker compose down                  # apagar todo (los datos se conservan)
docker compose up -d --build         # reconstruir tras cambiar el código
```

Abrir una terminal dentro de un contenedor o consultar la base:

```bash
docker compose exec backend sh
docker compose exec db psql -U mrkutz -d mrkutz
```

> **`docker compose down -v` borra la base de datos del contenedor.** El `-v`
> elimina el volumen con todos los datos y no hay vuelta atrás. Sin `-v`, apagar
> y volver a encender conserva todo.

---

## 4. Decisiones de la dockerización (y por qué)

**Node 22 en ambas imágenes.** El `engines` de los `package.json` dice `>=18`,
pero quedó desactualizado: Vite 8 exige `^20.19.0 || >=22.12.0` y con Node 18 el
frontend ni siquiera compila. Se usa la misma línea en los dos paquetes para no
tener dos versiones distintas en el mismo despliegue.

**Imágenes multi-etapa.** El frontend se compila con Node y se sirve con Nginx:
la imagen final no lleva Node ni `node_modules`, solo los archivos estáticos. El
backend separa la instalación de dependencias de la ejecución, de modo que
reconstruir tras un cambio de código no vuelve a instalar todo.

**`npm ci`, no `npm install`.** Instala exactamente las versiones fijadas en
`package-lock.json`, así la imagen es reproducible: la misma construcción hoy y
dentro de seis meses da el mismo resultado.

**OpenSSL en las imágenes Alpine.** Prisma elige su motor de consultas según el
OpenSSL del sistema; sin instalarlo, la generación del cliente avisa de que no
lo detecta y puede quedar preparada para el objetivo equivocado.

**Las migraciones se aplican al arrancar, no al construir.** Durante el
`docker build` todavía no existe ninguna base de datos a la que conectarse. El
`docker-entrypoint.sh` ejecuta `prisma migrate deploy` justo antes de iniciar la
API, cuando PostgreSQL ya está sano. En Render sí van en el build porque allí la
base ya existe antes de desplegar.

**El backend no corre como `root`.** La imagen cambia al usuario `node`, que ya
viene en la imagen oficial. Si alguien lograra ejecutar código dentro del
contenedor, no podría alterar el sistema de archivos de la imagen.

**El frontend habla con `/api`, una ruta relativa.** El navegador la pide al
mismo origen desde el que cargó la página y Nginx la reenvía al backend. Es el
mismo montaje que hoy hace `vercel.json` en producción, y evita tanto el CORS
como dejar quemada una URL de API dentro del bundle.

**Nginx reenvía `X-Forwarded-For`.** El backend hace `app.set('trust proxy', 1)`
y limita los intentos de inicio de sesión por IP. Sin esa cabecera, todos los
usuarios llegarían con la IP de Nginx y compartirían la misma cuota, que es
justo lo que el límite pretende evitar.

**Los `.env` locales no entran en las imágenes.** Están excluidos en los
`.dockerignore`. Es deliberado y es importante: `backend/.env` apunta a la base
de datos **real** en la nube, y si se copiara a la imagen, el contenedor
escribiría en producción creyendo que trabaja contra la base local.

---

## 5. Relación con el despliegue actual

La dockerización **no reemplaza ni modifica** el despliegue que ya está en
marcha:

- **Render** (backend) sigue usando `backend/render.yaml`.
- **Vercel** (frontend) sigue usando `frontend/vercel.json`.

Ninguno de esos archivos se tocó. Docker es una forma adicional de ejecutar el
mismo código, pensada para desarrollo local, para demostrar el sistema sin
depender de internet y para que cualquiera pueda levantarlo sin configurar nada
a mano.

---

## 6. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Define JWT_SECRET en el archivo .env` | Falta el `.env` en la raíz. `cp .env.docker.example .env` y edítalo. |
| `port is already allocated` | Otro programa usa ese puerto. Cambia `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT` o `DB_HOST_PORT` en el `.env`. |
| La web carga pero no hay datos | Falta el catálogo base: `docker compose exec backend npm run db:seed`. |
| No puedo iniciar sesión | No existe el administrador: ejecuta `create-admin` (sección 2). |
| Error de CORS en la consola del navegador | `FRONTEND_URL` del `.env` no coincide con la dirección real desde la que abres la aplicación. |
| El backend reinicia una y otra vez | Mira `docker compose logs backend`. Suele ser la base aún no lista o una migración que falló. |
