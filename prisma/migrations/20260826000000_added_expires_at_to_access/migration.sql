-- AlterTable
ALTER TABLE "Access" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Give an access which was granted before a date in the far future, because it
-- was granted with no expiration date
UPDATE "Access"
SET "expiresAt" = '2030-12-31 23:59:59.999'
WHERE "expiresAt" IS NULL;

-- AlterTable
ALTER TABLE "Access" ALTER COLUMN "expiresAt" SET NOT NULL;
