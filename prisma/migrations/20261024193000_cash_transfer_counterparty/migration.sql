-- CreateEnum
CREATE TYPE "CashTransferCounterpartyMode" AS ENUM ('CASH', 'LEGACY');

-- AlterTable
ALTER TABLE "CashEvent" ADD COLUMN     "transferCounterpartyAccountId" TEXT,
ADD COLUMN     "transferCounterpartyAmount" DECIMAL(65,30),
ADD COLUMN     "transferCounterpartyCurrency" TEXT,
ADD COLUMN     "transferCounterpartyMode" "CashTransferCounterpartyMode";

-- AddForeignKey
ALTER TABLE "CashEvent" ADD CONSTRAINT "CashEvent_transferCounterpartyAccountId_userId_fkey" FOREIGN KEY ("transferCounterpartyAccountId", "userId") REFERENCES "Account"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
