/*
  Warnings:

  - A unique constraint covering the columns `[token_fingerprint]` on the table `UserSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token_fingerprint` to the `UserSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "token_fingerprint" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_fingerprint_key" ON "UserSession"("token_fingerprint");
