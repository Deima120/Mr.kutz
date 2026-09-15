-- CreateEnum
CREATE TYPE "BarberAbsenceType" AS ENUM ('vacation', 'sick_leave', 'permission', 'holiday', 'other');

-- CreateTable
CREATE TABLE "barber_schedule_exceptions" (
    "id" SERIAL NOT NULL,
    "barber_id" INTEGER NOT NULL,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "type" "BarberAbsenceType" NOT NULL,
    "reason" VARCHAR(300),
    "batch_id" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" INTEGER,

    CONSTRAINT "barber_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_schedule_exceptions_barber_id_date_from_date_to_idx" ON "barber_schedule_exceptions"("barber_id", "date_from", "date_to");

-- CreateIndex
CREATE INDEX "barber_schedule_exceptions_batch_id_idx" ON "barber_schedule_exceptions"("batch_id");

-- AddForeignKey
ALTER TABLE "barber_schedule_exceptions" ADD CONSTRAINT "barber_schedule_exceptions_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_schedule_exceptions" ADD CONSTRAINT "barber_schedule_exceptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_schedule_exceptions" ADD CONSTRAINT "barber_schedule_exceptions_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
