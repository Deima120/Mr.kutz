-- Ventas de inventario en pagos, anulación sin borrado, precio de venta en producto

ALTER TABLE "Product" ADD COLUMN "retail_price" DECIMAL(10,2);

ALTER TABLE "Payment" ADD COLUMN "product_id" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "product_quantity" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "voided_at" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "void_reason" VARCHAR(500);
ALTER TABLE "Payment" ADD COLUMN "voided_by" INTEGER;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
