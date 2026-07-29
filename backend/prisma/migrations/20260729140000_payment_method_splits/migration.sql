-- Etapa 1 pago mixto: is_cash + payment_method_splits + tendered/change + backfill 1:1

-- 1) Flag is_cash en catálogo de métodos
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "is_cash" BOOLEAN NOT NULL DEFAULT false;

UPDATE "payment_methods"
SET "is_cash" = true
WHERE "name" = 'efectivo';

UPDATE "payment_methods"
SET "is_cash" = false
WHERE "name" <> 'efectivo';

-- 2) Campos de efectivo/vuelto en cabecera Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "amount_tendered" DECIMAL(10, 2);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "change_given" DECIMAL(10, 2);

-- 3) Tabla de splits por método
CREATE TABLE IF NOT EXISTS "payment_method_splits" (
  "id" SERIAL NOT NULL,
  "payment_id" INTEGER NOT NULL,
  "payment_method_id" INTEGER NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_method_splits_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_splits_payment_id_fkey'
  ) THEN
    ALTER TABLE "payment_method_splits"
      ADD CONSTRAINT "payment_method_splits_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "Payment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_splits_payment_method_id_fkey'
  ) THEN
    ALTER TABLE "payment_method_splits"
      ADD CONSTRAINT "payment_method_splits_payment_method_id_fkey"
      FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_method_splits_payment_id_payment_method_id_key"
  ON "payment_method_splits"("payment_id", "payment_method_id");

CREATE INDEX IF NOT EXISTS "payment_method_splits_payment_method_id_idx"
  ON "payment_method_splits"("payment_method_id");

-- 4) Completar payment_method_id nulos con efectivo (si existe) para no perder filas en backfill
UPDATE "Payment" p
SET "payment_method_id" = m.id
FROM "payment_methods" m
WHERE p."payment_method_id" IS NULL
  AND m."name" = 'efectivo';

-- Si aún quedaran pagos sin método y existe algún método activo, usar el de menor id
UPDATE "Payment" p
SET "payment_method_id" = (
  SELECT m.id FROM "payment_methods" m
  WHERE m."is_active" = true
  ORDER BY m.id ASC
  LIMIT 1
)
WHERE p."payment_method_id" IS NULL;

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM "Payment" WHERE "payment_method_id" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Etapa 1 pago mixto: % Payment(s) sin payment_method_id y sin métodos en catálogo. Abortando.',
      orphan_count;
  END IF;
END $$;

-- 5) Backfill: 1 split por Payment existente (método + amount actuales)
INSERT INTO "payment_method_splits" ("payment_id", "payment_method_id", "amount", "created_at")
SELECT p."id", p."payment_method_id", p."amount", COALESCE(p."created_at", CURRENT_TIMESTAMP)
FROM "Payment" p
WHERE p."payment_method_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_method_splits" s
    WHERE s."payment_id" = p."id"
  );

-- 6) Gate de verificación
DO $$
DECLARE
  payment_count INTEGER;
  split_count INTEGER;
  payments_with_split INTEGER;
BEGIN
  SELECT COUNT(*) INTO payment_count FROM "Payment";
  SELECT COUNT(*) INTO split_count FROM "payment_method_splits";
  SELECT COUNT(DISTINCT "payment_id") INTO payments_with_split FROM "payment_method_splits";

  IF payment_count <> payments_with_split THEN
    RAISE EXCEPTION
      'Gate pago mixto FALLÓ: Payment=% con split distinto=% (splits totales=%).',
      payment_count, payments_with_split, split_count;
  END IF;

  IF payment_count <> split_count THEN
    RAISE EXCEPTION
      'Gate pago mixto FALLÓ: Payment=% vs splits=% (se esperaba exactamente 1 split por pago en backfill).',
      payment_count, split_count;
  END IF;

  RAISE NOTICE 'Gate pago mixto OK: Payment=% = splits=% (1:1).', payment_count, split_count;
END $$;
