-- AlterTable
ALTER TABLE "Allergies" ALTER COLUMN "allergy_name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserLogs" (
    "log_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blood_pressure_id" INTEGER,
    "glucose_id" INTEGER,
    "metric_id" INTEGER,
    "notes" TEXT,
    "log_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLogs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "UserLogs_user_id_idx" ON "UserLogs"("user_id");

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_blood_pressure_id_fkey" FOREIGN KEY ("blood_pressure_id") REFERENCES "BloodPressure"("bp_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_glucose_id_fkey" FOREIGN KEY ("glucose_id") REFERENCES "GlucoseLevels"("glucose_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "HealthMetrics"("metric_id") ON DELETE SET NULL ON UPDATE CASCADE;
