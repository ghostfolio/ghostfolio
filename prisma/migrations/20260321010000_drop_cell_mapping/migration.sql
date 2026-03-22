-- DropForeignKey
ALTER TABLE "CellAggregationRule" DROP CONSTRAINT "CellAggregationRule_partnershipId_fkey";

-- DropForeignKey
ALTER TABLE "CellMapping" DROP CONSTRAINT "CellMapping_partnershipId_fkey";

-- DropTable
DROP TABLE "CellAggregationRule";

-- DropTable
DROP TABLE "CellMapping";
