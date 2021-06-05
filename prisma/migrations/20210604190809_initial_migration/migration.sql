-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SECURITIES');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CHF', 'EUR', 'USD', 'GBP');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('GHOSTFOLIO', 'RAKUTEN', 'YAHOO', 'ALPHA_VANTAGE');

-- CreateEnum
CREATE TYPE "ViewMode" AS ENUM ('DEFAULT', 'ZEN');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('GOOGLE', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'DEMO');

-- CreateEnum
CREATE TYPE "Type" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "Access" (
    "granteeUserId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id","userId")
);

-- CreateTable
CREATE TABLE "Account" (
    "accountType" "AccountType" NOT NULL DEFAULT E'SECURITIES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "platformId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id","userId")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "activityCount" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MarketData" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "marketPrice" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "currency" "Currency" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" "Type" NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "accountUserId" TEXT,
    "dataSource" "DataSource" NOT NULL DEFAULT E'YAHOO',

    PRIMARY KEY ("id","userId")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "url" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Settings" (
    "currency" "Currency",
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "viewMode" "ViewMode",

    PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id","userId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "provider" "Provider",
    "thirdPartyId" TEXT,
    "accessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL DEFAULT E'USER',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alias" TEXT,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketData.date_symbol_unique" ON "MarketData"("date", "symbol");

-- CreateIndex
CREATE INDEX "MarketData.symbol_index" ON "MarketData"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Platform.url_unique" ON "Platform"("url");

-- AddForeignKey
ALTER TABLE "Access" ADD FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Access" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD FOREIGN KEY ("accountId", "accountUserId") REFERENCES "Account"("id", "userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
