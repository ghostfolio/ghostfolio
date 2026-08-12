-- AlterTable
ALTER TABLE "Access" ADD COLUMN "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Derive the scopes from the permissions of the existing accesses
UPDATE "Access"
SET "scopes" = CASE
  WHEN 'READ' = ANY("permissions") THEN ARRAY[
    'account:read',
    'activity:read',
    'portfolio:read',
    'portfolio:read:values',
    'watchlist:read'
  ]
  ELSE ARRAY[
    'account:read',
    'activity:read',
    'portfolio:read',
    'watchlist:read'
  ]
END;
