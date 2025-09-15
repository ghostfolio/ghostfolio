-- CreateTable
CREATE TABLE "public"."DataProviderGhostfolioResolvedAssetProfile" (
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "dataSource" "public"."DataSource" NOT NULL,
  "id" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 1,
  "symbol" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DataProviderGhostfolioResolvedAssetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataProviderGhostfolioResolvedAssetProfile_dataSource_symbo_key" ON "public"."DataProviderGhostfolioResolvedAssetProfile"("dataSource", "symbol");
