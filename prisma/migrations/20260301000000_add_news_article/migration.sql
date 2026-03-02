-- CreateTable
CREATE TABLE IF NOT EXISTS "NewsArticle" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "finnhubId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticle_finnhubId_key" ON "NewsArticle"("finnhubId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsArticle_symbol_idx" ON "NewsArticle"("symbol");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");
