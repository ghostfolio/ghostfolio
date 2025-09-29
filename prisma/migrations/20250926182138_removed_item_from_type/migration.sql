-- AlterEnum
BEGIN;
CREATE TYPE "public"."Type_new" AS ENUM ('BUY', 'DIVIDEND', 'FEE', 'INTEREST', 'LIABILITY', 'SELL');
ALTER TABLE "public"."Order" ALTER COLUMN "type" TYPE "public"."Type_new" USING ("type"::text::"public"."Type_new");
ALTER TYPE "public"."Type" RENAME TO "Type_old";
ALTER TYPE "public"."Type_new" RENAME TO "Type";
DROP TYPE "public"."Type_old";
COMMIT;
