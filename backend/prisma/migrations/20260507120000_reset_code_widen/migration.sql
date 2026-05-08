-- Ampliar reset_code para almacenar hash bcrypt del código de recuperación
ALTER TABLE "User" ALTER COLUMN "reset_code" SET DATA TYPE VARCHAR(255);
