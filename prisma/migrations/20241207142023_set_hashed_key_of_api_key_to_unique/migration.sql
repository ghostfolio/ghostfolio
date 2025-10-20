-- DropIndex
DROP INDEX "ApiKey_hashedKey_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");
