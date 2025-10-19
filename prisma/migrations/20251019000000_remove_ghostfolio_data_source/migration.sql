-- Update existing records to use MANUAL instead of GHOSTFOLIO
UPDATE "MarketData" SET "dataSource" = 'MANUAL' WHERE "dataSource" = 'GHOSTFOLIO';
UPDATE "SymbolProfile" SET "dataSource" = 'MANUAL' WHERE "dataSource" = 'GHOSTFOLIO';

-- Create new enum without GHOSTFOLIO
CREATE TYPE "DataSource_new" AS ENUM ('ALPHA_VANTAGE', 'COINGECKO', 'EOD_HISTORICAL_DATA', 'FINANCIAL_MODELING_PREP', 'GOOGLE_SHEETS', 'MANUAL', 'RAPID_API', 'YAHOO');

-- Update columns to use new enum
ALTER TABLE "MarketData" ALTER COLUMN "dataSource" TYPE "DataSource_new" USING ("dataSource"::text::"DataSource_new");
ALTER TABLE "SymbolProfile" ALTER COLUMN "dataSource" TYPE "DataSource_new" USING ("dataSource"::text::"DataSource_new");

-- Drop old enum
ALTER TYPE "DataSource" RENAME TO "DataSource_old";
ALTER TYPE "DataSource_new" RENAME TO "DataSource";
DROP TYPE "DataSource_old";