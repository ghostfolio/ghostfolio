-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "cusip" TEXT;

-- CreateIndex
CREATE INDEX "SymbolProfile_cusip_idx" ON "SymbolProfile"("cusip");
