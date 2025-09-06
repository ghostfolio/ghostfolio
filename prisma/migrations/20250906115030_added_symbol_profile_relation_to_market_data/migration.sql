-- AlterTable
ALTER TABLE "public"."MarketData" ADD COLUMN "symbolProfileId" TEXT;

-- CreateIndex
CREATE INDEX "MarketData_symbolProfileId_idx" ON "public"."MarketData"("symbolProfileId");

-- AddForeignKey
ALTER TABLE "public"."MarketData" ADD CONSTRAINT "MarketData_symbolProfileId_fkey" FOREIGN KEY ("symbolProfileId") REFERENCES "public"."SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
