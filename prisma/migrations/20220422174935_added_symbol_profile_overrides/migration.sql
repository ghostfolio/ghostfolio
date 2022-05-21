-- CreateTable
CREATE TABLE "SymbolProfileOverrides" (
    "assetClass" "AssetClass",
    "assetSubClass" "AssetSubClass",
    "countries" JSONB,
    "name" TEXT,
    "sectors" JSONB,
    "symbolProfileId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolProfileOverrides_pkey" PRIMARY KEY ("symbolProfileId")
);

-- AddForeignKey
ALTER TABLE "SymbolProfileOverrides" ADD CONSTRAINT "SymbolProfileOverrides_symbolProfileId_fkey" FOREIGN KEY ("symbolProfileId") REFERENCES "SymbolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
