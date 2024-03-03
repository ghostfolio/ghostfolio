-- CreateIndex
CREATE INDEX "Account_id_idx" ON "Account"("id");

-- CreateIndex
CREATE INDEX "MarketData_dataSource_idx" ON "MarketData"("dataSource");

-- CreateIndex
CREATE INDEX "MarketData_date_idx" ON "MarketData"("date");

-- CreateIndex
CREATE INDEX "Order_accountId_idx" ON "Order"("accountId");
