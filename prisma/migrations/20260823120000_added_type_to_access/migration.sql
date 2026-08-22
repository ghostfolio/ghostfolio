-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('MCP', 'PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Access" ADD COLUMN "type" "AccessType" NOT NULL DEFAULT 'PRIVATE';

-- Derive the type from the grantee of the existing accesses
UPDATE "Access"
SET "type" = CASE
  WHEN "granteeUserId" IS NULL THEN 'PUBLIC'::"AccessType"
  ELSE 'PRIVATE'::"AccessType"
END;
