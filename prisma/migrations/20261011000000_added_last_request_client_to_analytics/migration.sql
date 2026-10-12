-- CreateEnum
CREATE TYPE "RequestClient" AS ENUM ('API', 'MCP', 'SELF_HOSTING', 'WEB');

-- AlterTable
ALTER TABLE "Analytics" ADD COLUMN "lastRequestClient" "RequestClient";
