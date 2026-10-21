-- AlterTable
ALTER TABLE "UserLogs" ADD COLUMN     "food_log_id" INTEGER,
ADD COLUMN     "symptom_id" INTEGER;

-- CreateTable
CREATE TABLE "Symptoms" (
    "symptom_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symptom" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "notes" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Symptoms_pkey" PRIMARY KEY ("symptom_id")
);

-- CreateTable
CREATE TABLE "FoodLogs" (
    "food_log_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "meal_type" TEXT,
    "calories" INTEGER,
    "carbs" DECIMAL(65,30),
    "protein" DECIMAL(65,30),
    "fat" DECIMAL(65,30),
    "notes" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLogs_pkey" PRIMARY KEY ("food_log_id")
);

-- CreateIndex
CREATE INDEX "Symptoms_user_id_idx" ON "Symptoms"("user_id");

-- CreateIndex
CREATE INDEX "FoodLogs_user_id_idx" ON "FoodLogs"("user_id");

-- AddForeignKey
ALTER TABLE "Symptoms" ADD CONSTRAINT "Symptoms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogs" ADD CONSTRAINT "FoodLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "Symptoms"("symptom_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_food_log_id_fkey" FOREIGN KEY ("food_log_id") REFERENCES "FoodLogs"("food_log_id") ON DELETE SET NULL ON UPDATE CASCADE;
