-- Etapa 1 pagos multi-línea: PaymentLine + backfill + FKs.
-- NO elimina appointment_id / product_id / product_quantity de Payment (legacy intacto).

-- 1) Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentLineType') THEN
    CREATE TYPE "PaymentLineType" AS ENUM ('service', 'product', 'manual');
  END IF;
END $$;

-- 2) Cabecera: cliente + FK voided_by
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "client_id" INTEGER;

CREATE INDEX IF NOT EXISTS "Payment_client_id_idx" ON "Payment"("client_id");
CREATE INDEX IF NOT EXISTS "Payment_created_at_idx" ON "Payment"("created_at");
CREATE INDEX IF NOT EXISTS "Payment_voided_at_idx" ON "Payment"("voided_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_client_id_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "Client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_voided_by_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Tabla de líneas
CREATE TABLE IF NOT EXISTS "payment_lines" (
  "id" SERIAL NOT NULL,
  "payment_id" INTEGER NOT NULL,
  "line_type" "PaymentLineType" NOT NULL,
  "appointment_id" INTEGER,
  "product_id" INTEGER,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "line_amount" DECIMAL(10,2) NOT NULL,
  "description" VARCHAR(200),
  "voided_at" TIMESTAMP(3),
  "void_reason" VARCHAR(500),
  "voided_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_lines_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_lines_payment_id_fkey') THEN
    ALTER TABLE "payment_lines"
      ADD CONSTRAINT "payment_lines_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "Payment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_lines_appointment_id_fkey') THEN
    ALTER TABLE "payment_lines"
      ADD CONSTRAINT "payment_lines_appointment_id_fkey"
      FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_lines_product_id_fkey') THEN
    ALTER TABLE "payment_lines"
      ADD CONSTRAINT "payment_lines_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "Product"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_lines_voided_by_fkey') THEN
    ALTER TABLE "payment_lines"
      ADD CONSTRAINT "payment_lines_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "payment_lines_payment_id_idx" ON "payment_lines"("payment_id");
CREATE INDEX IF NOT EXISTS "payment_lines_product_id_idx" ON "payment_lines"("product_id");
CREATE INDEX IF NOT EXISTS "payment_lines_appointment_id_idx" ON "payment_lines"("appointment_id");

-- 4) Movimientos: vínculo a línea
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "payment_line_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryMovement_payment_line_id_fkey'
  ) THEN
    ALTER TABLE "InventoryMovement"
      ADD CONSTRAINT "InventoryMovement_payment_line_id_fkey"
      FOREIGN KEY ("payment_line_id") REFERENCES "payment_lines"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InventoryMovement_payment_line_id_idx"
  ON "InventoryMovement"("payment_line_id");

-- 5) Pre-check: no permitir dos pagos vigentes legacy sobre la misma cita
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT "appointment_id"
    FROM "Payment"
    WHERE "appointment_id" IS NOT NULL AND "voided_at" IS NULL
    GROUP BY "appointment_id"
    HAVING COUNT(*) > 1
  ) d;
  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Etapa 1 abortada: hay % cita(s) con más de un pago vigente. Resuélvelo antes del backfill.',
      dup_count;
  END IF;
END $$;

-- 6) Backfill líneas (idempotente: solo pagos sin líneas aún)
INSERT INTO "payment_lines" (
  "payment_id",
  "line_type",
  "appointment_id",
  "product_id",
  "quantity",
  "unit_price",
  "line_amount",
  "description",
  "voided_at",
  "void_reason",
  "voided_by",
  "created_at"
)
SELECT
  p."id",
  'service'::"PaymentLineType",
  p."appointment_id",
  NULL,
  1,
  p."amount",
  p."amount",
  LEFT(COALESCE(s."name", 'Servicio'), 200),
  p."voided_at",
  p."void_reason",
  p."voided_by",
  p."created_at"
FROM "Payment" p
LEFT JOIN "Appointment" a ON a."id" = p."appointment_id"
LEFT JOIN "Service" s ON s."id" = a."service_id"
WHERE p."appointment_id" IS NOT NULL
  AND p."product_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "payment_lines" pl WHERE pl."payment_id" = p."id"
  );

INSERT INTO "payment_lines" (
  "payment_id",
  "line_type",
  "appointment_id",
  "product_id",
  "quantity",
  "unit_price",
  "line_amount",
  "description",
  "voided_at",
  "void_reason",
  "voided_by",
  "created_at"
)
SELECT
  p."id",
  'product'::"PaymentLineType",
  NULL,
  p."product_id",
  COALESCE(NULLIF(p."product_quantity", 0), 1),
  ROUND(
    p."amount" / COALESCE(NULLIF(p."product_quantity", 0), 1)::numeric,
    2
  ),
  p."amount",
  LEFT(COALESCE(pr."name", 'Producto'), 200),
  p."voided_at",
  p."void_reason",
  p."voided_by",
  p."created_at"
FROM "Payment" p
LEFT JOIN "Product" pr ON pr."id" = p."product_id"
WHERE p."product_id" IS NOT NULL
  AND p."appointment_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "payment_lines" pl WHERE pl."payment_id" = p."id"
  );

-- Caja / sin vínculo: línea manual
INSERT INTO "payment_lines" (
  "payment_id",
  "line_type",
  "appointment_id",
  "product_id",
  "quantity",
  "unit_price",
  "line_amount",
  "description",
  "voided_at",
  "void_reason",
  "voided_by",
  "created_at"
)
SELECT
  p."id",
  'manual'::"PaymentLineType",
  NULL,
  NULL,
  1,
  p."amount",
  p."amount",
  LEFT(
    COALESCE(NULLIF(BTRIM(p."notes"), ''), NULLIF(BTRIM(p."reference"), ''), 'Cobro en caja'),
    200
  ),
  p."voided_at",
  p."void_reason",
  p."voided_by",
  p."created_at"
FROM "Payment" p
WHERE p."appointment_id" IS NULL
  AND p."product_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "payment_lines" pl WHERE pl."payment_id" = p."id"
  );

-- Caso anómalo XOR (cita + producto en la misma cabecera): no debería existir.
DO $$
DECLARE
  xor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO xor_count
  FROM "Payment"
  WHERE "appointment_id" IS NOT NULL AND "product_id" IS NOT NULL;
  IF xor_count > 0 THEN
    RAISE EXCEPTION
      'Etapa 1 abortada: hay % pago(s) con appointment_id y product_id a la vez (XOR roto).',
      xor_count;
  END IF;
END $$;

-- 7) client_id desde cita (línea service o legacy appointment_id)
UPDATE "Payment" p
SET "client_id" = a."client_id"
FROM "Appointment" a
WHERE p."client_id" IS NULL
  AND p."appointment_id" = a."id";

UPDATE "Payment" p
SET "client_id" = a."client_id"
FROM "payment_lines" pl
JOIN "Appointment" a ON a."id" = pl."appointment_id"
WHERE p."client_id" IS NULL
  AND pl."payment_id" = p."id"
  AND pl."line_type" = 'service'
  AND pl."appointment_id" IS NOT NULL;

-- 8) Vincular movimientos de venta a la línea de producto
UPDATE "InventoryMovement" im
SET "payment_line_id" = pl."id"
FROM "payment_lines" pl
WHERE im."payment_line_id" IS NULL
  AND im."payment_id" IS NOT NULL
  AND pl."payment_id" = im."payment_id"
  AND pl."line_type" = 'product'
  AND (im."movement_type" = 'sale' OR im."movement_type" IS NULL);

-- 9) Unique parcial: una línea de servicio activa por cita
CREATE UNIQUE INDEX IF NOT EXISTS "payment_lines_active_appointment_uidx"
  ON "payment_lines" ("appointment_id")
  WHERE "appointment_id" IS NOT NULL AND "voided_at" IS NULL;
