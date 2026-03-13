# Mr. Kutz

Sistema de gestión para barbería. Frontend React + Backend Node.js/Express + PostgreSQL (Neon).

## Requisitos

- Node.js 18+
- Cuenta Neon (PostgreSQL en la nube) o PostgreSQL local

## Configuración

### Backend

1. `cd backend`
2. Copia `.env.example` a `.env` (o crea `.env` con):
   - `DATABASE_URL` – URL de conexión a Neon/PostgreSQL
   - `JWT_SECRET` – secreto para tokens (producción)
   - `PORT` (opcional, default 5000)
3. `npm install`
4. `npm run db:push` – sincroniza schema con la BD
5. `npm run db:seed` – crea roles, usuarios de prueba y datos iniciales

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Usuarios de prueba

| Email              | Contraseña   | Rol    |
|--------------------|--------------|--------|
| admin@mrkutz.com   | password123  | Admin  |
| barber@mrkutz.com  | password123  | Barbero|
| client@mrkutz.com  | password123  | Cliente|

## Comandos

**Backend:**
- `npm run dev` – servidor con hot reload
- `npm run db:generate` – regenerar cliente Prisma
- `npm run db:push` – aplicar schema a BD
- `npm run db:seed` – ejecutar seed
- `npm run db:studio` – abrir Prisma Studio

**Frontend:**
- `npm run dev` – desarrollo (puerto 5173)
- `npm run build` – build de producción
