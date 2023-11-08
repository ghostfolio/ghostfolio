-- AlterEnum
ALTER TYPE "Type" ADD VALUE 'STAKE';

-- CreateTable
CREATE TABLE "_SymbolProfileToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SymbolProfileToTag_AB_unique" ON "_SymbolProfileToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_SymbolProfileToTag_B_index" ON "_SymbolProfileToTag"("B");

-- AddForeignKey
ALTER TABLE "_SymbolProfileToTag" ADD CONSTRAINT "_SymbolProfileToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SymbolProfileToTag" ADD CONSTRAINT "_SymbolProfileToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
