-- Hallazgos de la auditoria de normalizacion (2026-09-11):
-- 1) Client.email y Client.(document_type, document_number) se exigian unicos
--    solo por codigo (client.service.js), sin constraint real en la base. Se
--    verifico contra la base real antes de escribir esto: 0 correos y 0 pares
--    tipo+numero duplicados entre los 55 clientes existentes, asi que el UNIQUE
--    se puede crear directo, sin backfill previo.
-- 2) Appointment.status era VARCHAR(20) libre, validado solo por
--    express-validator (isIn([...])) en appointment.routes.js, pese a que el
--    resto del esquema ya usa enums de Postgres para estados finitos
--    (PurchaseStatus, CashRegisterStatus). Se verifico contra la base real que
--    los unicos valores en uso hoy son exactamente los 6 que ya validaba el
--    endpoint (scheduled/confirmed/in_progress/completed/cancelled/no_show),
--    asi que el cast directo no pierde ni rechaza ninguna fila existente.

-- 1) Enum nuevo para el estado de la cita.
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Conversion en el lugar (no DROP+ADD): preserva las 207 citas existentes.
ALTER TABLE "Appointment"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AppointmentStatus" USING "status"::"AppointmentStatus",
  ALTER COLUMN "status" SET DEFAULT 'scheduled';

-- 2) Unicidad real de Client.email (NULL no cuenta como duplicado: los
-- clientes creados sin correo -si los hubiera- conviven sin problema).
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- 3) Unicidad real del PAR document_type + document_number (no del numero
-- solo: dos clientes pueden compartir numero si el tipo de documento es
-- distinto, mismo criterio que ya aplica client.service.js al validar).
CREATE UNIQUE INDEX "Client_document_type_document_number_key" ON "Client"("document_type", "document_number");
