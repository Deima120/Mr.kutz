-- Folios internos: secuencias diarias + UNIQUE en Payment.reference

CREATE TABLE IF NOT EXISTS "document_sequences" (
    "id" SERIAL NOT NULL,
    "doc_type" VARCHAR(32) NOT NULL,
    "period_key" VARCHAR(8) NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_sequences_doc_type_period_key_key"
  ON "document_sequences"("doc_type", "period_key");

-- Backfill referencias vacías / nulas
UPDATE "Payment"
SET "reference" = 'LEGACY-' || LPAD("id"::text, 10, '0')
WHERE "reference" IS NULL OR BTRIM("reference") = '';

-- Desduplicar referencias repetidas (conserva el id menor)
WITH ranked AS (
  SELECT
    "id",
    "reference",
    ROW_NUMBER() OVER (PARTITION BY UPPER(BTRIM("reference")) ORDER BY "id") AS rn
  FROM "Payment"
  WHERE "reference" IS NOT NULL
)
UPDATE "Payment" p
SET "reference" = 'LEGACY-DUP-' || LPAD(p."id"::text, 10, '0')
FROM ranked r
WHERE p."id" = r."id" AND r.rn > 1;

ALTER TABLE "Payment" ALTER COLUMN "reference" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_reference_key" ON "Payment"("reference");
