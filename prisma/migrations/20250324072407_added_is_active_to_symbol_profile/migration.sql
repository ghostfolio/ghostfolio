-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "SymbolProfile_isActive_idx" ON "SymbolProfile"("isActive");
