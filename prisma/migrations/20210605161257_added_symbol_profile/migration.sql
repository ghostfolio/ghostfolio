-- AlterTable
ALTER TABLE "Order" ADD COLUMN "symbolProfileId" TEXT;

-- CreateTable
CREATE TABLE "SymbolProfile" (
    "countries" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSource" "DataSource" NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SymbolProfile.dataSource_symbol_unique" ON "SymbolProfile"("dataSource", "symbol");

-- AddForeignKey
ALTER TABLE "Order" ADD FOREIGN KEY ("symbolProfileId") REFERENCES "SymbolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
