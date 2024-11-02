-- AlterTable
ALTER TABLE "Analytics" ADD COLUMN "lastRequestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Analytics_lastRequestAt_idx" ON "Analytics"("lastRequestAt");
