-- DropIndex
DROP INDEX "Order_symbolProfileId_idx";

-- DropIndex
DROP INDEX "Order_type_idx";

-- DropIndex
DROP INDEX "Order_userId_idx";

-- CreateIndex
CREATE INDEX "Order_symbolProfileId_date_idx" ON "Order"("symbolProfileId", "date");

-- CreateIndex
CREATE INDEX "Order_userId_date_idx" ON "Order"("userId", "date");

-- CreateIndex
CREATE INDEX "Order_userId_type_date_idx" ON "Order"("userId", "type", "date");
