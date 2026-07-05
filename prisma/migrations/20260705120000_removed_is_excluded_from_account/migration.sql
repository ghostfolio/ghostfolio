-- Create the "EXCLUDE_FROM_ANALYSIS" tag if it does not exist yet
INSERT INTO "Tag" ("id", "name")
VALUES ('f2e868af-8333-459f-b161-cbc6544c24bd', 'EXCLUDE_FROM_ANALYSIS')
ON CONFLICT DO NOTHING;

-- Migrate accounts with "isExcluded" to the "EXCLUDE_FROM_ANALYSIS" tag
INSERT INTO "TagsOnAccounts" ("accountId", "tagId", "updatedAt", "userId")
SELECT
  "id",
  'f2e868af-8333-459f-b161-cbc6544c24bd',
  CURRENT_TIMESTAMP,
  "userId"
FROM "Account"
WHERE "isExcluded" = true
ON CONFLICT DO NOTHING;

-- DropIndex
DROP INDEX "Account_isExcluded_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "isExcluded";
