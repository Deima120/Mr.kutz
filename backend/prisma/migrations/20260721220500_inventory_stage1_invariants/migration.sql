-- Etapa 1: importes positivos y costo promedio protegido por el dominio.
-- NOT VALID conserva registros históricos, pero aplica las reglas a escrituras nuevas.

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_retail_price_positive_check"
  CHECK ("retail_price" IS NULL OR "retail_price" > 0) NOT VALID,
  ADD CONSTRAINT "Product_cost_price_positive_check"
  CHECK ("cost_price" IS NULL OR "cost_price" > 0) NOT VALID;

ALTER TABLE "purchase_items"
  DROP CONSTRAINT IF EXISTS "purchase_items_unit_cost_check",
  ADD CONSTRAINT "purchase_items_unit_cost_check"
  CHECK ("unit_cost" > 0) NOT VALID;

ALTER TABLE "goods_receipt_items"
  DROP CONSTRAINT IF EXISTS "goods_receipt_items_unit_cost_check",
  ADD CONSTRAINT "goods_receipt_items_unit_cost_check"
  CHECK ("unit_cost" > 0) NOT VALID;
