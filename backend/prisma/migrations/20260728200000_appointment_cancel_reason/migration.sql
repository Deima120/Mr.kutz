-- Motivo de cancelación de citas (obligatorio al pasar a cancelled).
-- La tabla real es "Appointment" (modelo Prisma sin @@map), no "appointments".
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancel_reason" VARCHAR(500);
