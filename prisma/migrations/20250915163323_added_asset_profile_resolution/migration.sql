-- CreateTable
CREATE TABLE "public"."AssetProfileResolution" (
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "dataSourceOrigin" "public"."DataSource" NOT NULL,
  "dataSourceTarget" "public"."DataSource" NOT NULL,
  "id" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 1,
  "symbolOrigin" TEXT NOT NULL,
  "symbolTarget" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssetProfileResolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfileResolution_dataSourceOrigin_symbolOrigin_key" ON "public"."AssetProfileResolution"("dataSourceOrigin", "symbolOrigin");
