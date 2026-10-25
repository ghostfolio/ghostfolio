-- CreateEnum
CREATE TYPE "CashEventType" AS ENUM ('CHECKPOINT', 'MOVEMENT');

-- AlterTable
ALTER TABLE "AccountBalance" ADD COLUMN "isCashManagementProjection" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AccountCashState" (
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "defaultUpdateCash" BOOLEAN NOT NULL DEFAULT false,
    "openingDate" DATE NOT NULL,
    "openingBalance" DECIMAL(65,30) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountCashState_pkey" PRIMARY KEY ("accountId", "userId"),
    CONSTRAINT "AccountCashState_revision_check" CHECK ("revision" >= 0),
    CONSTRAINT "AccountCashState_lastSequence_check" CHECK ("lastSequence" >= 0),
    CONSTRAINT "AccountCashState_openingBalance_check" CHECK ("openingBalance" <> 'NaN'::numeric)
);

-- CreateTable
CREATE TABLE "CashEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "orderId" TEXT,
    "transferId" TEXT,
    "type" "CashEventType" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CashEvent_sequence_check" CHECK ("sequence" > 0),
    CONSTRAINT "CashEvent_value_check" CHECK ("value" <> 'NaN'::numeric)
);

-- CreateIndex
CREATE UNIQUE INDEX "CashEvent_accountId_userId_date_sequence_key" ON "CashEvent"("accountId", "userId", "date", "sequence");

-- AddForeignKey
ALTER TABLE "AccountCashState" ADD CONSTRAINT "AccountCashState_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "Account"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashEvent" ADD CONSTRAINT "CashEvent_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "AccountCashState"("accountId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CashEvent_orderId_key" ON "CashEvent"("orderId");
ALTER TABLE "CashEvent" ADD CONSTRAINT "CashEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
