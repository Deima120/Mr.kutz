-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "client_rating" INTEGER,
ADD COLUMN "client_rating_comment" VARCHAR(2000),
ADD COLUMN "client_rated_at" TIMESTAMP(3);
