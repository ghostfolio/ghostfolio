-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "SymbolProfile" ADD CONSTRAINT "SymbolProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Set userIds in SymbolProfile for 'MANUAL' data source
UPDATE "SymbolProfile"
SET "userId" = (
  SELECT "userId"
  FROM "Order"
  WHERE "Order"."symbolProfileId" = "SymbolProfile"."id"
  LIMIT 1
)
WHERE "dataSource" = 'MANUAL';
