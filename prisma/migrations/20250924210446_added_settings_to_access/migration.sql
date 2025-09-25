-- AlterTable
ALTER TABLE "public"."Access" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
