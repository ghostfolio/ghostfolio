-- CreateEnum
CREATE TYPE "K1ImportStatus" AS ENUM ('PROCESSING', 'EXTRACTED', 'VERIFIED', 'CONFIRMED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "K1ImportSession" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "K1ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "taxYear" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "extractionMethod" TEXT NOT NULL,
    "rawExtraction" JSONB,
    "verifiedData" JSONB,
    "documentId" TEXT,
    "kDocumentId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "K1ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellMapping" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT,
    "boxNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "cellType" TEXT NOT NULL DEFAULT 'number',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isIgnored" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellAggregationRule" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT,
    "name" TEXT NOT NULL,
    "operation" TEXT NOT NULL DEFAULT 'SUM',
    "sourceCells" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellAggregationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "K1ImportSession_partnershipId_taxYear_idx" ON "K1ImportSession"("partnershipId", "taxYear");

-- CreateIndex
CREATE INDEX "K1ImportSession_userId_idx" ON "K1ImportSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "K1ImportSession_kDocumentId_key" ON "K1ImportSession"("kDocumentId");

-- CreateIndex
CREATE INDEX "CellMapping_partnershipId_idx" ON "CellMapping"("partnershipId");

-- CreateIndex
CREATE UNIQUE INDEX "CellMapping_partnershipId_boxNumber_key" ON "CellMapping"("partnershipId", "boxNumber");

-- CreateIndex
CREATE INDEX "CellAggregationRule_partnershipId_idx" ON "CellAggregationRule"("partnershipId");

-- CreateIndex
CREATE UNIQUE INDEX "CellAggregationRule_partnershipId_name_key" ON "CellAggregationRule"("partnershipId", "name");

-- AddForeignKey
ALTER TABLE "K1ImportSession" ADD CONSTRAINT "K1ImportSession_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "K1ImportSession" ADD CONSTRAINT "K1ImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "K1ImportSession" ADD CONSTRAINT "K1ImportSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "K1ImportSession" ADD CONSTRAINT "K1ImportSession_kDocumentId_fkey" FOREIGN KEY ("kDocumentId") REFERENCES "KDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMapping" ADD CONSTRAINT "CellMapping_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAggregationRule" ADD CONSTRAINT "CellAggregationRule_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
