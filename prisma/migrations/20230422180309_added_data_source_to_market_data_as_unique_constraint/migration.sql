-- DropIndex
DROP INDEX "MarketData_date_symbol_key";

-- CreateIndex
CREATE UNIQUE INDEX "MarketData_dataSource_date_symbol_key" ON "MarketData"("dataSource", "date", "symbol");
