-- CreateTable
CREATE TABLE "Allergies" (
    "allergy_id" SERIAL NOT NULL,
    "allergy_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Allergies_pkey" PRIMARY KEY ("allergy_id")
);

-- CreateTable
CREATE TABLE "Appointments" (
    "appointment_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "Appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "BloodPressure" (
    "bp_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "measurement_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BloodPressure_pkey" PRIMARY KEY ("bp_id")
);

-- CreateTable
CREATE TABLE "Diseases" (
    "disease_id" SERIAL NOT NULL,
    "disease_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Diseases_pkey" PRIMARY KEY ("disease_id")
);

-- CreateTable
CREATE TABLE "GlucoseLevels" (
    "glucose_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "glucose_level" DECIMAL(65,30) NOT NULL,
    "measurement_time" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "GlucoseLevels_pkey" PRIMARY KEY ("glucose_id")
);

-- CreateTable
CREATE TABLE "HealthMetrics" (
    "metric_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "height_cm" DECIMAL(65,30),
    "weight_kg" DECIMAL(65,30),
    "bmi" DECIMAL(65,30),
    "recorded_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthMetrics_pkey" PRIMARY KEY ("metric_id")
);

-- CreateTable
CREATE TABLE "LabTests" (
    "lab_test_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "test_type" TEXT NOT NULL,
    "result_value" TEXT,
    "result_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTests_pkey" PRIMARY KEY ("lab_test_id")
);

-- CreateTable
CREATE TABLE "MedicationReminder" (
    "reminder_id" SERIAL NOT NULL,
    "user_medication_id" INTEGER NOT NULL,
    "reminder_time" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "MedicationReminder_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "MedicationTypes" (
    "medication_type_id" SERIAL NOT NULL,
    "medication_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MedicationTypes_pkey" PRIMARY KEY ("medication_type_id")
);

-- CreateTable
CREATE TABLE "Medications" (
    "medication_id" SERIAL NOT NULL,
    "medication_type_id" INTEGER NOT NULL,
    "generic_name" TEXT,
    "brand_name" TEXT,

    CONSTRAINT "Medications_pkey" PRIMARY KEY ("medication_id")
);

-- CreateTable
CREATE TABLE "NutritionGuidelines" (
    "guideline_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,

    CONSTRAINT "NutritionGuidelines_pkey" PRIMARY KEY ("guideline_id")
);

-- CreateTable
CREATE TABLE "UserAllergies" (
    "user_allergy_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "allergy_id" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "UserAllergies_pkey" PRIMARY KEY ("user_allergy_id")
);

-- CreateTable
CREATE TABLE "UserDisease" (
    "user_id" INTEGER NOT NULL,
    "disease_id" INTEGER NOT NULL,

    CONSTRAINT "UserDisease_pkey" PRIMARY KEY ("user_id","disease_id")
);

-- CreateTable
CREATE TABLE "UserMedications" (
    "user_medication_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "medication_id" INTEGER NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),

    CONSTRAINT "UserMedications_pkey" PRIMARY KEY ("user_medication_id")
);

-- CreateTable
CREATE TABLE "Users" (
    "user_id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "registration_date" TIMESTAMP(3),

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodPressure" ADD CONSTRAINT "BloodPressure_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlucoseLevels" ADD CONSTRAINT "GlucoseLevels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMetrics" ADD CONSTRAINT "HealthMetrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTests" ADD CONSTRAINT "LabTests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_user_medication_id_fkey" FOREIGN KEY ("user_medication_id") REFERENCES "UserMedications"("user_medication_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medications" ADD CONSTRAINT "Medications_medication_type_id_fkey" FOREIGN KEY ("medication_type_id") REFERENCES "MedicationTypes"("medication_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGuidelines" ADD CONSTRAINT "NutritionGuidelines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAllergies" ADD CONSTRAINT "UserAllergies_allergy_id_fkey" FOREIGN KEY ("allergy_id") REFERENCES "Allergies"("allergy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAllergies" ADD CONSTRAINT "UserAllergies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDisease" ADD CONSTRAINT "UserDisease_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "Diseases"("disease_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDisease" ADD CONSTRAINT "UserDisease_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMedications" ADD CONSTRAINT "UserMedications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "Medications"("medication_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMedications" ADD CONSTRAINT "UserMedications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
