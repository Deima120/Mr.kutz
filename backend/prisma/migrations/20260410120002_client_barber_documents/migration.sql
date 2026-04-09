-- Documento de identidad (clientes y barberos); notas de cliente acotadas
-- Idempotente: columnas pueden existir si ya se aplicó parte del cambio (db push / intento previo).

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "document_type" VARCHAR(40);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "document_number" VARCHAR(80);

ALTER TABLE "Barber" ADD COLUMN IF NOT EXISTS "document_type" VARCHAR(40);
ALTER TABLE "Barber" ADD COLUMN IF NOT EXISTS "document_number" VARCHAR(80);

UPDATE "Client" SET "notes" = LEFT("notes"::text, 500) WHERE "notes" IS NOT NULL AND LENGTH("notes"::text) > 500;

DO $$
DECLARE
  notes_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO notes_type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'Client'
    AND a.attname = 'notes'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF notes_type = 'text' THEN
    ALTER TABLE "Client" ALTER COLUMN "notes" TYPE VARCHAR(500) USING (
      CASE WHEN "notes" IS NULL THEN NULL ELSE LEFT("notes"::text, 500) END
    );
  END IF;
END $$;
