-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('CASH', 'COMMODITY', 'EQUITY');

-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "assetClass" "AssetClass";
