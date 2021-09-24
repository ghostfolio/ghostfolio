-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "currency" TYPE TEXT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "currency" TYPE TEXT;

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "currency" TYPE TEXT;

-- AlterTable
ALTER TABLE "SymbolProfile" ALTER COLUMN "currency" TYPE TEXT;

-- DropEnum
DROP TYPE "Currency" CASCADE;
