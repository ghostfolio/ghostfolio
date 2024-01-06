-- AlterTable
ALTER TABLE "Access" ADD COLUMN "permissions" "AccessPermission"[] DEFAULT ARRAY['READ_RESTRICTED']::"AccessPermission"[];
