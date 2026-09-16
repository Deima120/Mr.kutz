-- Client.email pasa a obligatorio: hoy no hay ningún registro con email NULL (auditado antes de
-- aplicar esta migración), así que es seguro exigirlo también a nivel de columna, no solo en
-- backend/frontend.
ALTER TABLE "Client" ALTER COLUMN "email" SET NOT NULL;

-- Client.notes vuelve a texto sin límite (se había acortado a VARCHAR(500) en la migración
-- 20260410120002_client_barber_documents; se revierte esa decisión a pedido del propietario).
ALTER TABLE "Client" ALTER COLUMN "notes" SET DATA TYPE TEXT;

-- Campos de texto libre (notas, motivos de anulación/cancelación, comentarios de reseña,
-- descripciones largas) que estaban en VARCHAR con un tope corto sin una razón documentada de
-- acortarlos. Se homologan a TEXT, igual que ya tenían Appointment.notes, Payment.notes,
-- Purchase.notes, Product.description, Service.description, ProductCategory.description, etc.
ALTER TABLE "Appointment" ALTER COLUMN "client_rating_comment" SET DATA TYPE TEXT,
ALTER COLUMN "cancel_reason" SET DATA TYPE TEXT;

ALTER TABLE "Payment" ALTER COLUMN "void_reason" SET DATA TYPE TEXT;

ALTER TABLE "expenses" ALTER COLUMN "notes" SET DATA TYPE TEXT,
ALTER COLUMN "void_reason" SET DATA TYPE TEXT;

ALTER TABLE "goods_receipts" ALTER COLUMN "notes" SET DATA TYPE TEXT;

ALTER TABLE "other_incomes" ALTER COLUMN "notes" SET DATA TYPE TEXT,
ALTER COLUMN "void_reason" SET DATA TYPE TEXT;

ALTER TABLE "payment_lines" ALTER COLUMN "void_reason" SET DATA TYPE TEXT;

ALTER TABLE "purchases" ALTER COLUMN "void_reason" SET DATA TYPE TEXT;

-- ServiceCategory.description se homologa a TEXT para igualar a ProductCategory.description,
-- que ya era TEXT (ambos modelos de categoría deberían comportarse igual).
ALTER TABLE "service_categories" ALTER COLUMN "description" SET DATA TYPE TEXT;

ALTER TABLE "suppliers" ALTER COLUMN "address" SET DATA TYPE TEXT,
ALTER COLUMN "notes" SET DATA TYPE TEXT;

ALTER TABLE "testimonials" ALTER COLUMN "content" SET DATA TYPE TEXT;
