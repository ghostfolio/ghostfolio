-- DropIndex
DROP INDEX "Order_symbolProfileId_idx";

-- DropIndex
DROP INDEX "Order_type_idx";

-- DropIndex
DROP INDEX "Order_userId_idx";

-- CreateIndex
CREATE INDEX "Order_userId_type_idx" ON "Order"("userId", "type");
