-- CreateEnum
CREATE TYPE "AccessPermission" AS ENUM ('READ', 'READ_RESTRICTED');

-- AlterTable
ALTER TABLE "Access" ADD COLUMN "permissions" "AccessPermission"[] DEFAULT ARRAY['READ_RESTRICTED']::"AccessPermission"[];
