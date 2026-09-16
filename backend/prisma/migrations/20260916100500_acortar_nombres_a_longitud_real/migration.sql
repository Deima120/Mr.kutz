-- El nombre de una persona real nunca llega a 100 caracteres; el tope anterior
-- permitía pegar basura (p. ej. "Emanuelgggggggggggggggggggggggggggggggggggggggg")
-- que superaba la longitud de cualquier nombre real pero seguía siendo solo letras,
-- así que la validación de formato no lo detectaba. Se homologa a 50, igual que ya
-- exige `personNameField` en `backend/src/utils/validation.js`.
ALTER TABLE "Barber" ALTER COLUMN "first_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "last_name" SET DATA TYPE VARCHAR(50);

ALTER TABLE "Client" ALTER COLUMN "first_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "last_name" SET DATA TYPE VARCHAR(50);

ALTER TABLE "testimonials" ALTER COLUMN "author_name" SET DATA TYPE VARCHAR(50);
