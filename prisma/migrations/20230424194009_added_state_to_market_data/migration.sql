-- CreateEnum
CREATE TYPE "MarketDataState" AS ENUM ('CLOSE', 'INTRADAY');

-- AlterTable
ALTER TABLE "MarketData" ADD COLUMN "state" "MarketDataState" NOT NULL DEFAULT 'CLOSE';
