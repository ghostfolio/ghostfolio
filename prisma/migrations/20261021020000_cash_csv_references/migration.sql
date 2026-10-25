ALTER TABLE "CashEvent" ADD COLUMN "importReference" TEXT;
CREATE UNIQUE INDEX "CashEvent_accountId_userId_importReference_key" ON "CashEvent"("accountId", "userId", "importReference");
