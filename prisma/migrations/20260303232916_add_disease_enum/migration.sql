/*
  Warnings:

  - Changed the type of `disease_name` on the `Diseases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DiseaseName" AS ENUM ('DIABETES', 'HYPERTENSION', 'ASTHMA');

-- AlterTable
ALTER TABLE "Diseases" DROP COLUMN "disease_name",
ADD COLUMN     "disease_name" "DiseaseName" NOT NULL;
