-- Almacenar hash del código de recuperación (bcrypt) en lugar de texto plano.
ALTER TABLE "users" ALTER COLUMN "reset_code" TYPE VARCHAR(255);

-- Intentos fallidos de verificación antes de invalidar el código.
ALTER TABLE "users" ADD COLUMN "reset_code_attempts" INTEGER NOT NULL DEFAULT 0;
