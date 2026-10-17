-- DropIndex
DROP INDEX "AccountBalance_accountId_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "AccountBalance_accountId_userId_date_key" ON "AccountBalance"("accountId", "userId", "date");
