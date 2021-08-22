-- CreateEnum
CREATE TYPE "AssetSubClass" AS ENUM ('CRYPTOCURRENCY', 'ETF', 'STOCK');

-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN     "assetSubClass" "AssetSubClass";
