-- CreateTable
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refresh_token_key" ON "UserSession"("refresh_token");

-- CreateIndex
CREATE INDEX "UserSession_user_id_idx" ON "UserSession"("user_id");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
