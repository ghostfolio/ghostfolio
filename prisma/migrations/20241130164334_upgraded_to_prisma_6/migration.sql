-- AlterTable
ALTER TABLE "_OrderToTag" ADD CONSTRAINT "_OrderToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_OrderToTag_AB_unique";
