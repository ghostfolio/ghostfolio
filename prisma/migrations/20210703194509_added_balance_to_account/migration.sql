-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'CASH';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT E'USD';
