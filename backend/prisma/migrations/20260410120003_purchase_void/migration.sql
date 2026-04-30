-- Anulación de compras (auditoría + reverso de inventario en servicio)
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMP(3);
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "void_reason" VARCHAR(500);
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "voided_by" INTEGER;
