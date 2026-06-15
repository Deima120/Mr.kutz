-- P3: costo de producto y anulación de movimientos manuales
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cost_price" DECIMAL(10, 2);

ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "void_reason" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "voided_by" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryMovement_voided_by_fkey'
  ) THEN
    ALTER TABLE "InventoryMovement"
      ADD CONSTRAINT "InventoryMovement_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
