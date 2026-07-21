-- Normaliza proveedores, convierte compras en órdenes y agrega recepciones trazables.
-- Los movimientos históricos se conservan intactos y deliberadamente quedan sin source FK.

DO $$ BEGIN
  CREATE TYPE "PurchaseStatus" AS ENUM (
    'draft', 'ordered', 'partially_received', 'received', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM (
    'purchase', 'sale', 'adjustment', 'damage', 'reversal'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventorySourceType" AS ENUM (
    'goods_receipt', 'payment', 'manual_adjustment', 'reversal'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "suppliers" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "normalized_name" VARCHAR(150) NOT NULL,
  "tax_id" VARCHAR(50),
  "contact_name" VARCHAR(150),
  "email" VARCHAR(255),
  "phone" VARCHAR(30),
  "address" VARCHAR(500),
  "notes" VARCHAR(1000),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_normalized_name_key"
  ON "suppliers"("normalized_name");
CREATE UNIQUE INDEX "suppliers_tax_id_key"
  ON "suppliers"("tax_id");
CREATE INDEX "suppliers_is_active_name_idx"
  ON "suppliers"("is_active", "name");

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Un proveedor por nombre histórico, comparado sin espacios repetidos ni mayúsculas.
INSERT INTO "suppliers" ("name", "normalized_name")
SELECT MIN(BTRIM("supplier_name")),
       LOWER(REGEXP_REPLACE(BTRIM("supplier_name"), '\s+', ' ', 'g'))
FROM "purchases"
WHERE NULLIF(BTRIM("supplier_name"), '') IS NOT NULL
GROUP BY LOWER(REGEXP_REPLACE(BTRIM("supplier_name"), '\s+', ' ', 'g'))
ON CONFLICT ("normalized_name") DO NOTHING;

-- Solo se crea el fallback cuando existen compras sin proveedor identificable.
INSERT INTO "suppliers" ("name", "normalized_name", "notes")
SELECT 'Proveedor histórico sin identificar',
       'proveedor histórico sin identificar',
       'Creado automáticamente durante la migración'
WHERE EXISTS (
  SELECT 1 FROM "purchases"
  WHERE NULLIF(BTRIM("supplier_name"), '') IS NULL
)
ON CONFLICT ("normalized_name") DO NOTHING;

ALTER TABLE "purchases"
  ADD COLUMN "supplier_id" INTEGER,
  ADD COLUMN "order_number" VARCHAR(80),
  ADD COLUMN "status" "PurchaseStatus",
  ADD COLUMN "ordered_at" TIMESTAMP(3),
  ADD COLUMN "expected_at" TIMESTAMP(3);

UPDATE "purchases" p
SET "supplier_id" = s."id"
FROM "suppliers" s
WHERE s."normalized_name" =
      LOWER(REGEXP_REPLACE(BTRIM(p."supplier_name"), '\s+', ' ', 'g'))
  AND NULLIF(BTRIM(p."supplier_name"), '') IS NOT NULL;

UPDATE "purchases" p
SET "supplier_id" = s."id"
FROM "suppliers" s
WHERE p."supplier_id" IS NULL
  AND s."normalized_name" = 'proveedor histórico sin identificar';

UPDATE "purchases"
SET "order_number" = 'LEGACY-' || LPAD("id"::text, 10, '0'),
    "status" = CASE
      WHEN "voided_at" IS NULL THEN 'received'::"PurchaseStatus"
      ELSE 'cancelled'::"PurchaseStatus"
    END,
    "ordered_at" = "created_at";

ALTER TABLE "purchases"
  ALTER COLUMN "supplier_id" SET NOT NULL,
  ALTER COLUMN "order_number" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'draft',
  ALTER COLUMN "status" SET NOT NULL;

CREATE UNIQUE INDEX "purchases_order_number_key"
  ON "purchases"("order_number");
CREATE INDEX "purchases_supplier_id_status_idx"
  ON "purchases"("supplier_id", "status");
CREATE INDEX "purchases_status_created_at_idx"
  ON "purchases"("status", "created_at");

ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_voided_by_fkey"
  FOREIGN KEY ("voided_by") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "purchase_items"
  ADD COLUMN "received_quantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "purchase_items" SET "received_quantity" = "quantity";

CREATE INDEX "purchase_items_purchase_id_product_id_idx"
  ON "purchase_items"("purchase_id", "product_id");

CREATE TABLE "goods_receipts" (
  "id" SERIAL NOT NULL,
  "purchase_id" INTEGER NOT NULL,
  "receipt_number" VARCHAR(80) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" VARCHAR(1000),
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "goods_receipts_receipt_number_key"
  ON "goods_receipts"("receipt_number");
CREATE INDEX "goods_receipts_purchase_id_received_at_idx"
  ON "goods_receipts"("purchase_id", "received_at");

ALTER TABLE "goods_receipts"
  ADD CONSTRAINT "goods_receipts_purchase_id_fkey"
  FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts"
  ADD CONSTRAINT "goods_receipts_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Una recepción documental por compra histórica; no crea movimientos ni toca stock.
INSERT INTO "goods_receipts" (
  "purchase_id", "receipt_number", "received_at", "notes", "created_by", "created_at"
)
SELECT p."id",
       'HIST-' || LPAD(p."id"::text, 10, '0'),
       p."created_at",
       'Recepción histórica creada por migración; movimientos legacy no enlazados.',
       p."created_by",
       p."created_at"
FROM "purchases" p;

CREATE TABLE "goods_receipt_items" (
  "id" SERIAL NOT NULL,
  "goods_receipt_id" INTEGER NOT NULL,
  "purchase_item_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_cost" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "goods_receipt_items_goods_receipt_id_purchase_item_id_key"
  ON "goods_receipt_items"("goods_receipt_id", "purchase_item_id");
CREATE INDEX "goods_receipt_items_purchase_item_id_idx"
  ON "goods_receipt_items"("purchase_item_id");

ALTER TABLE "goods_receipt_items"
  ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey"
  FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_items"
  ADD CONSTRAINT "goods_receipt_items_purchase_item_id_fkey"
  FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "goods_receipt_items" (
  "goods_receipt_id", "purchase_item_id", "quantity", "unit_cost", "created_at"
)
SELECT gr."id", pi."id", pi."quantity", pi."unit_cost", gr."created_at"
FROM "goods_receipts" gr
JOIN "purchase_items" pi ON pi."purchase_id" = gr."purchase_id";

ALTER TABLE "InventoryMovement"
  ADD COLUMN "source_type" "InventorySourceType",
  ADD COLUMN "goods_receipt_item_id" INTEGER,
  ADD COLUMN "payment_id" INTEGER,
  ADD COLUMN "reversal_of_movement_id" INTEGER;

ALTER TABLE "InventoryMovement"
  ALTER COLUMN "movement_type" TYPE "InventoryMovementType"
  USING (
    CASE
      WHEN "movement_type" IN ('purchase', 'sale', 'adjustment', 'damage')
      THEN "movement_type"::"InventoryMovementType"
      ELSE NULL
    END
  );

CREATE UNIQUE INDEX "InventoryMovement_goods_receipt_item_id_key"
  ON "InventoryMovement"("goods_receipt_item_id");
CREATE UNIQUE INDEX "InventoryMovement_reversal_of_movement_id_key"
  ON "InventoryMovement"("reversal_of_movement_id");
CREATE INDEX "InventoryMovement_product_id_created_at_idx"
  ON "InventoryMovement"("product_id", "created_at");
CREATE INDEX "InventoryMovement_payment_id_idx"
  ON "InventoryMovement"("payment_id");

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_goods_receipt_item_id_fkey"
  FOREIGN KEY ("goods_receipt_item_id") REFERENCES "goods_receipt_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "Payment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_reversal_of_movement_id_fkey"
  FOREIGN KEY ("reversal_of_movement_id") REFERENCES "InventoryMovement"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement"
  DROP CONSTRAINT "InventoryMovement_product_id_fkey";
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOT VALID conserva datos legacy posiblemente imperfectos, pero protege escrituras nuevas.
ALTER TABLE "Inventory"
  ADD CONSTRAINT "Inventory_quantity_nonnegative_check"
  CHECK ("quantity" >= 0) NOT VALID;
ALTER TABLE "purchase_items"
  ADD CONSTRAINT "purchase_items_quantity_positive_check"
  CHECK ("quantity" > 0) NOT VALID,
  ADD CONSTRAINT "purchase_items_received_quantity_check"
  CHECK ("received_quantity" >= 0 AND "received_quantity" <= "quantity") NOT VALID,
  ADD CONSTRAINT "purchase_items_unit_cost_check"
  CHECK ("unit_cost" >= 0) NOT VALID;
ALTER TABLE "goods_receipt_items"
  ADD CONSTRAINT "goods_receipt_items_quantity_positive_check"
  CHECK ("quantity" > 0) NOT VALID,
  ADD CONSTRAINT "goods_receipt_items_unit_cost_check"
  CHECK ("unit_cost" >= 0) NOT VALID;
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_quantity_nonzero_check"
  CHECK ("quantity_change" <> 0) NOT VALID,
  ADD CONSTRAINT "InventoryMovement_sign_check"
  CHECK (
    "movement_type" IS NULL
    OR ("movement_type" = 'purchase' AND "quantity_change" > 0)
    OR ("movement_type" = 'sale' AND "quantity_change" < 0)
    OR ("movement_type" = 'damage' AND "quantity_change" < 0)
    OR "movement_type" IN ('adjustment', 'reversal')
  ) NOT VALID;
