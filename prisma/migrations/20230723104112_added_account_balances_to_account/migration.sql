-- CreateTable
CREATE TABLE "AccountBalance" (
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AccountBalance_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "Account"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate current account balance to time series (AccountBalance[])
INSERT INTO "AccountBalance" ("accountId", "createdAt", "date", "id", "updatedAt", "userId", "value")
SELECT
    "id",
    "updatedAt",
    "updatedAt",
    "id",
    "updatedAt",
    "userId",
    "balance"
FROM "Account";
