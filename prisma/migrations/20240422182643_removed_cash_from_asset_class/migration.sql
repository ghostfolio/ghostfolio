-- AlterEnum
BEGIN;
CREATE TYPE "AssetClass_new" AS ENUM ('COMMODITY', 'EQUITY', 'FIXED_INCOME', 'LIQUIDITY', 'REAL_ESTATE');
ALTER TABLE "SymbolProfile" ALTER COLUMN "assetClass" TYPE "AssetClass_new" USING ("assetClass"::text::"AssetClass_new");
ALTER TABLE "SymbolProfileOverrides" ALTER COLUMN "assetClass" TYPE "AssetClass_new" USING ("assetClass"::text::"AssetClass_new");
ALTER TYPE "AssetClass" RENAME TO "AssetClass_old";
ALTER TYPE "AssetClass_new" RENAME TO "AssetClass";
DROP TYPE "AssetClass_old";
COMMIT;
