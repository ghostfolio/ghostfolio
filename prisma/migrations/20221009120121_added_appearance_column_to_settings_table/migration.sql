-- CreateEnum
CREATE TYPE "Appearance" AS ENUM ('AUTO', 'LIGHT', 'DARK');

-- Update Settings table
ALTER TABLE "Settings" ADD COLUMN "appearance" "Appearance";