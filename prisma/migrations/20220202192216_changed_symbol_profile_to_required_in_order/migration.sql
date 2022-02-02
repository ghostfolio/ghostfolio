-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_symbolProfileId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "symbolProfileId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_symbolProfileId_fkey" FOREIGN KEY ("symbolProfileId") REFERENCES "SymbolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
