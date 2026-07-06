-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('API', 'PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Access" ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "hashedApiToken" TEXT,
ADD COLUMN "type" "AccessType" NOT NULL DEFAULT 'PRIVATE';

-- Backfill type of existing accesses
UPDATE "Access" SET "type" = 'PUBLIC' WHERE "granteeUserId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Access_hashedApiToken_key" ON "Access"("hashedApiToken");
