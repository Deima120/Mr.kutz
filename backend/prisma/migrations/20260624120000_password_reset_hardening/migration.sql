-- Almacenar hash del código de recuperación en lugar de texto plano (6 dígitos).
ALTER TABLE "User" ALTER COLUMN "reset_code" TYPE VARCHAR(255);

-- Intentos fallidos de verificación antes de invalidar el código.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reset_code_attempts" INTEGER NOT NULL DEFAULT 0;
