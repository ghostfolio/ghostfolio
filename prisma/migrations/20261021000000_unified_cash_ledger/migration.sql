ALTER TABLE "AccountCashState"
  ADD COLUMN "includeCashInPortfolio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isAutomaticOpening" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CashEvent" DROP CONSTRAINT "CashEvent_sequence_check";
ALTER TABLE "CashEvent" ADD CONSTRAINT "CashEvent_sequence_check" CHECK ("sequence" >= 0);

-- Existing opening balances become ordinary reconciliations, preserving all
-- existing event identities and their ordering within the opening date.
INSERT INTO "CashEvent" ("id", "accountId", "userId", "date", "sequence", "type", "value", "createdAt", "updatedAt")
SELECT md5('opening:' || "accountId" || ':' || "userId")::uuid::text,
       "accountId", "userId", "openingDate", 0, 'CHECKPOINT', "openingBalance", NOW(), NOW()
FROM "AccountCashState";

-- Preserve legacy snapshots preceding an existing managed interval as explicit
-- reconciliations, rather than recreating past activity cash effects.
INSERT INTO "CashEvent" ("id", "accountId", "userId", "date", "sequence", "type", "value", "createdAt", "updatedAt")
SELECT b."id", b."accountId", b."userId", b."date"::date,
       s."lastSequence" + ROW_NUMBER() OVER (PARTITION BY b."accountId", b."userId" ORDER BY b."date", b."id"),
       'CHECKPOINT', b."value", b."createdAt", b."updatedAt"
FROM "AccountBalance" b JOIN "AccountCashState" s
  ON s."accountId" = b."accountId" AND s."userId" = b."userId"
WHERE b."date" < s."openingDate";

UPDATE "AccountCashState" s SET
  "lastSequence" = (SELECT COALESCE(MAX(e."sequence"), 0) FROM "CashEvent" e WHERE e."accountId" = s."accountId" AND e."userId" = s."userId"),
  "openingDate" = DATE '0001-01-01', "openingBalance" = 0,
  "isAutomaticOpening" = true, "revision" = "revision" + 1;

UPDATE "AccountBalance" b SET "isCashManagementProjection" = true
WHERE EXISTS (SELECT 1 FROM "AccountCashState" s WHERE s."accountId" = b."accountId" AND s."userId" = b."userId");
