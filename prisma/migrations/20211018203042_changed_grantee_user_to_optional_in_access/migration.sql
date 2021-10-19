-- AlterTable
ALTER TABLE "Access" ALTER COLUMN "granteeUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "currency" DROP NOT NULL;
