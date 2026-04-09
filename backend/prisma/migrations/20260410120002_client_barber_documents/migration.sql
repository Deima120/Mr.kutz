-- Documento de identidad (clientes y barberos); notas de cliente acotadas a 500 caracteres

ALTER TABLE "Client" ADD COLUMN "document_type" VARCHAR(40);
ALTER TABLE "Client" ADD COLUMN "document_number" VARCHAR(80);

ALTER TABLE "Barber" ADD COLUMN "document_type" VARCHAR(40);
ALTER TABLE "Barber" ADD COLUMN "document_number" VARCHAR(80);

UPDATE "Client" SET "notes" = LEFT("notes", 500) WHERE "notes" IS NOT NULL AND LENGTH("notes") > 500;

ALTER TABLE "Client" ALTER COLUMN "notes" TYPE VARCHAR(500) USING (
  CASE WHEN "notes" IS NULL THEN NULL ELSE LEFT("notes"::text, 500) END
);
