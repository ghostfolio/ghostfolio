-- CreateTable
CREATE TABLE "public"."AssetProfileSplit" (
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataSource" "public"."DataSource" NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "factor" DOUBLE PRECISION NOT NULL,
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssetProfileSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfileSplit_dataSource_date_symbol_key" ON "public"."AssetProfileSplit"("dataSource", "date", "symbol");

-- CreateIndex
CREATE INDEX "AssetProfileSplit_dataSource_symbol_idx" ON "public"."AssetProfileSplit"("dataSource", "symbol");

-- CreateIndex
CREATE INDEX "AssetProfileSplit_date_idx" ON "public"."AssetProfileSplit"("date");
