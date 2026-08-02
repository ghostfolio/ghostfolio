-- CreateTable
CREATE TABLE "AssetProfileSplit" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,
    "factor" DOUBLE PRECISION NOT NULL,
    "id" TEXT NOT NULL,
    "symbolProfileId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetProfileSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetProfileSplit_date_idx" ON "AssetProfileSplit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfileSplit_symbolProfileId_date_key" ON "AssetProfileSplit"("symbolProfileId", "date");

-- AddForeignKey
ALTER TABLE "AssetProfileSplit" ADD CONSTRAINT "AssetProfileSplit_symbolProfileId_fkey" FOREIGN KEY ("symbolProfileId") REFERENCES "SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
