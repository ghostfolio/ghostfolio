-- AlterTable
ALTER TABLE "Access" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Give an access which was granted before a date in the far future, because it
-- was granted with no expiration date
UPDATE "Access"
SET "expiresAt" = '2050-12-31 12:00:00'
WHERE "expiresAt" IS NULL;

-- AlterTable
ALTER TABLE "Access" ALTER COLUMN "expiresAt" SET NOT NULL;
