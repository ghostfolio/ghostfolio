-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'TRUST', 'LLC', 'LP', 'CORPORATION', 'FOUNDATION', 'ESTATE');

-- CreateEnum
CREATE TYPE "PartnershipType" AS ENUM ('LP', 'GP', 'LLC', 'JOINT_VENTURE', 'FUND');

-- CreateEnum
CREATE TYPE "DistributionType" AS ENUM ('INCOME', 'RETURN_OF_CAPITAL', 'CAPITAL_GAIN', 'GUARANTEED_PAYMENT', 'DIVIDEND', 'INTEREST');

-- CreateEnum
CREATE TYPE "KDocumentType" AS ENUM ('K1', 'K3');

-- CreateEnum
CREATE TYPE "KDocumentStatus" AS ENUM ('DRAFT', 'ESTIMATED', 'FINAL');

-- CreateEnum
CREATE TYPE "FamilyOfficeAssetType" AS ENUM ('PUBLIC_EQUITY', 'PRIVATE_EQUITY', 'REAL_ESTATE', 'HEDGE_FUND', 'VENTURE_CAPITAL', 'FIXED_INCOME', 'COMMODITY', 'ART_COLLECTIBLE', 'CRYPTOCURRENCY', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "ValuationSource" AS ENUM ('APPRAISAL', 'MARKET', 'MANUAL', 'NAV_STATEMENT', 'FUND_ADMIN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('K1', 'K3', 'CAPITAL_CALL', 'DISTRIBUTION_NOTICE', 'NAV_STATEMENT', 'APPRAISAL', 'TAX_RETURN', 'SUBSCRIPTION_AGREEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnershipType" NOT NULL,
    "inceptionDate" TIMESTAMP(3) NOT NULL,
    "fiscalYearEnd" INTEGER NOT NULL DEFAULT 12,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipMembership" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "ownershipPercent" DECIMAL(65,30) NOT NULL,
    "capitalCommitment" DECIMAL(65,30),
    "capitalContributed" DECIMAL(65,30),
    "classType" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ownership" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountUserId" TEXT NOT NULL,
    "ownershipPercent" DECIMAL(65,30) NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "costBasis" DECIMAL(65,30),
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distribution" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT,
    "entityId" TEXT NOT NULL,
    "type" "DistributionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "taxWithheld" DECIMAL(65,30) DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KDocument" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "type" "KDocumentType" NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "filingStatus" "KDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "documentFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipAsset" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "assetType" "FamilyOfficeAssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(65,30),
    "currentValue" DECIMAL(65,30),
    "currency" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetValuation" (
    "id" TEXT NOT NULL,
    "partnershipAssetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "source" "ValuationSource" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipValuation" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "nav" DECIMAL(65,30) NOT NULL,
    "source" "ValuationSource" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "entityId" TEXT,
    "partnershipId" TEXT,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "taxYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "Entity"("type");

-- CreateIndex
CREATE INDEX "Entity_userId_idx" ON "Entity"("userId");

-- CreateIndex
CREATE INDEX "Partnership_name_idx" ON "Partnership"("name");

-- CreateIndex
CREATE INDEX "Partnership_type_idx" ON "Partnership"("type");

-- CreateIndex
CREATE INDEX "Partnership_userId_idx" ON "Partnership"("userId");

-- CreateIndex
CREATE INDEX "PartnershipMembership_entityId_idx" ON "PartnershipMembership"("entityId");

-- CreateIndex
CREATE INDEX "PartnershipMembership_partnershipId_idx" ON "PartnershipMembership"("partnershipId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipMembership_entityId_partnershipId_effectiveDate_key" ON "PartnershipMembership"("entityId", "partnershipId", "effectiveDate");

-- CreateIndex
CREATE INDEX "Ownership_entityId_idx" ON "Ownership"("entityId");

-- CreateIndex
CREATE INDEX "Ownership_accountId_idx" ON "Ownership"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Ownership_entityId_accountId_accountUserId_effectiveDate_key" ON "Ownership"("entityId", "accountId", "accountUserId", "effectiveDate");

-- CreateIndex
CREATE INDEX "Distribution_partnershipId_idx" ON "Distribution"("partnershipId");

-- CreateIndex
CREATE INDEX "Distribution_entityId_idx" ON "Distribution"("entityId");

-- CreateIndex
CREATE INDEX "Distribution_date_idx" ON "Distribution"("date");

-- CreateIndex
CREATE INDEX "KDocument_partnershipId_idx" ON "KDocument"("partnershipId");

-- CreateIndex
CREATE INDEX "KDocument_taxYear_idx" ON "KDocument"("taxYear");

-- CreateIndex
CREATE UNIQUE INDEX "KDocument_partnershipId_type_taxYear_key" ON "KDocument"("partnershipId", "type", "taxYear");

-- CreateIndex
CREATE INDEX "PartnershipAsset_partnershipId_idx" ON "PartnershipAsset"("partnershipId");

-- CreateIndex
CREATE INDEX "PartnershipAsset_assetType_idx" ON "PartnershipAsset"("assetType");

-- CreateIndex
CREATE INDEX "AssetValuation_partnershipAssetId_idx" ON "AssetValuation"("partnershipAssetId");

-- CreateIndex
CREATE INDEX "AssetValuation_date_idx" ON "AssetValuation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssetValuation_partnershipAssetId_date_key" ON "AssetValuation"("partnershipAssetId", "date");

-- CreateIndex
CREATE INDEX "PartnershipValuation_partnershipId_idx" ON "PartnershipValuation"("partnershipId");

-- CreateIndex
CREATE INDEX "PartnershipValuation_date_idx" ON "PartnershipValuation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipValuation_partnershipId_date_key" ON "PartnershipValuation"("partnershipId", "date");

-- CreateIndex
CREATE INDEX "Document_entityId_idx" ON "Document"("entityId");

-- CreateIndex
CREATE INDEX "Document_partnershipId_idx" ON "Document"("partnershipId");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipMembership" ADD CONSTRAINT "PartnershipMembership_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipMembership" ADD CONSTRAINT "PartnershipMembership_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_accountId_accountUserId_fkey" FOREIGN KEY ("accountId", "accountUserId") REFERENCES "Account"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KDocument" ADD CONSTRAINT "KDocument_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KDocument" ADD CONSTRAINT "KDocument_documentFileId_fkey" FOREIGN KEY ("documentFileId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipAsset" ADD CONSTRAINT "PartnershipAsset_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValuation" ADD CONSTRAINT "AssetValuation_partnershipAssetId_fkey" FOREIGN KEY ("partnershipAssetId") REFERENCES "PartnershipAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipValuation" ADD CONSTRAINT "PartnershipValuation_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
