-- Revocacion de tokens JWT (hallazgo P-08 del diagnostico tecnico, 2026-09-12):
-- sin este contador, un JWT robado seguia siendo valido hasta sus 7 dias de
-- vida aunque la contrasena ya se hubiera cambiado. Con DEFAULT 0, todas las
-- filas existentes (y todos los tokens ya emitidos, que no llevan este campo
-- en su payload) quedan compatibles sin forzar un logout masivo al desplegar
-- esta migracion -el codigo del backend trata un token sin el campo como
-- version 0-.
ALTER TABLE "User" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
