-- Set default value
UPDATE "SymbolProfile" SET "currency" = 'USD' WHERE "currency" IS NULL;

-- AlterTable
ALTER TABLE "SymbolProfile" ALTER COLUMN "currency" SET NOT NULL;
