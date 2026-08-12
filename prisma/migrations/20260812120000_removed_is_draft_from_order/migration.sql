-- DropIndex
DROP INDEX "Order_isDraft_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "isDraft";
