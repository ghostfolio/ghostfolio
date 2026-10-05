-- CreateIndex
CREATE UNIQUE INDEX "MarketData_dataSource_symbol_date_key" ON "MarketData"("dataSource", "symbol", "date");

-- DropIndex
DROP INDEX "MarketData_dataSource_symbol_idx";

-- DropIndex
DROP INDEX "MarketData_dataSource_date_symbol_key";
