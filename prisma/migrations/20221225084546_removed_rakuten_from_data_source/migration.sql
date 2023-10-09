-- AlterEnum
BEGIN;
CREATE TYPE "DataSource_new" AS ENUM ('ALPHA_VANTAGE', 'EOD_HISTORICAL_DATA', 'GHOSTFOLIO', 'GOOGLE_SHEETS', 'MANUAL', 'RAPID_API', 'YAHOO');
ALTER TABLE "MarketData" ALTER COLUMN "dataSource" TYPE "DataSource_new" USING ("dataSource"::text::"DataSource_new");
ALTER TABLE "SymbolProfile" ALTER COLUMN "dataSource" TYPE "DataSource_new" USING ("dataSource"::text::"DataSource_new");
ALTER TYPE "DataSource" RENAME TO "DataSource_old";
ALTER TYPE "DataSource_new" RENAME TO "DataSource";
DROP TYPE "DataSource_old";
COMMIT;
