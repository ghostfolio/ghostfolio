-- AlterTable
ALTER TABLE "Order" ADD COLUMN "accountBalanceChange" DOUBLE PRECISION,
ADD COLUMN "updateAccountBalance" BOOLEAN NOT NULL DEFAULT false;
