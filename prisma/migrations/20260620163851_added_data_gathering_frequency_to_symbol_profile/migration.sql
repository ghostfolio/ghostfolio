-- CreateEnum
CREATE TYPE "DataGatheringFrequency" AS ENUM ('DAILY', 'HOURLY');

-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "dataGatheringFrequency" "DataGatheringFrequency" NOT NULL DEFAULT 'DAILY';

-- CreateIndex
CREATE INDEX "SymbolProfile_dataGatheringFrequency_idx" ON "SymbolProfile"("dataGatheringFrequency");
