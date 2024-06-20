-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "holdings" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "SymbolProfileOverrides" ADD COLUMN "holdings" JSONB DEFAULT '[]';
