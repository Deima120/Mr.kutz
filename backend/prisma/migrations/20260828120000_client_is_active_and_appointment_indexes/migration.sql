-- Inactivación de clientes y soporte para el tope de citas pendientes.
-- Las tablas reales son "Client" y "Appointment" (modelos Prisma sin @@map).

-- "Puede agendar". Se separa de User.is_active ("puede iniciar sesión") porque
-- los clientes creados desde la reserva pública no tienen fila en "User" y son
-- justamente los que pueden abusar del formulario sin autenticación.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Los nombres siguen el formato que genera Prisma por defecto
-- (<Tabla>_<col>_<col>_idx); con otro nombre, el próximo `prisma migrate dev`
-- intentaría recrearlos. Sin CONCURRENTLY: Prisma envuelve cada migración en una
-- transacción y ahí es ilegal (la tabla es pequeña, el bloqueo es de milisegundos).
CREATE INDEX IF NOT EXISTS "Appointment_client_id_appointment_date_idx"
  ON "Appointment" ("client_id", "appointment_date");

CREATE INDEX IF NOT EXISTS "Appointment_barber_id_appointment_date_idx"
  ON "Appointment" ("barber_id", "appointment_date");
