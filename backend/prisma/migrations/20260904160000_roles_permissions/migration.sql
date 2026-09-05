-- Permisos configurables por rol.
--
-- Migración PURAMENTE ADITIVA: crea dos tablas nuevas y añade a `Role` tres
-- columnas con valor por defecto. No modifica ni borra ningún dato existente, y
-- mientras el código no lea las tablas nuevas el comportamiento es idéntico.
--
-- Ojo con el nombre de la tabla de roles: es `Role`, en mayúscula y singular, no
-- `roles`. Es una de las tablas antiguas del proyecto, anteriores al cambio a
-- snake_case, y renombrarla rompería el modelo Prisma existente.

-- 1. Campos nuevos de Role -------------------------------------------------

-- `is_system` protege a admin/barber/client de que los borren o renombren desde
-- el panel: son la base del flujo de negocio.
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

-- `is_active` permite retirar de circulación un rol personalizado sin borrarlo.
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- El default es necesario para poder añadir una columna NOT NULL a filas que ya
-- existen; Prisma lo mantiene después con @updatedAt.
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Catálogo de permisos --------------------------------------------------

-- Se siembra desde prisma/seed.js a partir de src/config/permissions.js, que es
-- la fuente de verdad. La aplicación no crea permisos: uno que ningún código
-- consulte no haría nada.
CREATE TABLE IF NOT EXISTS "permissions" (
  "id"          SERIAL       NOT NULL,
  "code"        VARCHAR(80)  NOT NULL,
  "module"      VARCHAR(40)  NOT NULL,
  "description" VARCHAR(255),

  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_code_key" ON "permissions" ("code");
CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions" ("module");

-- 3. Asignación de permisos a roles ---------------------------------------

-- Cascade en ambos lados: al borrar un rol personalizado o al retirar un permiso
-- del catálogo, sus asignaciones se van con él y no queda basura.
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id"       INTEGER NOT NULL,
  "permission_id" INTEGER NOT NULL,

  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE INDEX IF NOT EXISTS "role_permissions_permission_id_idx"
  ON "role_permissions" ("permission_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_fkey'
  ) THEN
    ALTER TABLE "role_permissions"
      ADD CONSTRAINT "role_permissions_role_id_fkey"
      FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permission_id_fkey'
  ) THEN
    ALTER TABLE "role_permissions"
      ADD CONSTRAINT "role_permissions_permission_id_fkey"
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Marcar los roles del sistema ------------------------------------------

UPDATE "Role" SET "is_system" = true WHERE "name" IN ('admin', 'barber', 'client');
