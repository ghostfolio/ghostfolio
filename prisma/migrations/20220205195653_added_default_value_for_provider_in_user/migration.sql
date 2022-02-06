-- Set default value
UPDATE "User" SET "provider" = 'ANONYMOUS' WHERE "provider" IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "provider" SET NOT NULL,
ALTER COLUMN "provider" SET DEFAULT E'ANONYMOUS';
