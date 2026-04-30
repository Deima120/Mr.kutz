-- Ventas de inventario en pagos, anulación sin borrado, precio de venta en producto
-- Idempotente: seguro si parte de los cambios ya estaban aplicados (reintento tras fallo).

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "retail_price" DECIMAL(10,2);

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "product_id" INTEGER;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "product_quantity" INTEGER;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "void_reason" VARCHAR(500);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voided_by" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_product_id_fkey'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
