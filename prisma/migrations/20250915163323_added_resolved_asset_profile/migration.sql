-- CreateTable
CREATE TABLE "public"."ResolvedAssetProfile" (
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "dataSourceOrigin" "public"."DataSource" NOT NULL,
  "dataSourceTarget" "public"."DataSource" NOT NULL,
  "id" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 1,
  "symbol" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResolvedAssetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResolvedAssetProfile_dataSourceOrigin_symbol_key" ON "public"."ResolvedAssetProfile"("dataSourceOrigin", "symbol");
