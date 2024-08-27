-- AlterEnum
ALTER TYPE "Type" ADD VALUE IF NOT EXISTS 'STAKE';

-- CreateTable
CREATE TABLE IF NOT EXISTS "_SymbolProfileToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_SymbolProfileToTag_AB_unique" ON "_SymbolProfileToTag"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_SymbolProfileToTag_B_index" ON "_SymbolProfileToTag"("B");

-- AddForeignKey
ALTER TABLE "_SymbolProfileToTag" DROP CONSTRAINT IF EXISTS "_SymbolProfileToTag_A_fkey" ;
ALTER TABLE "_SymbolProfileToTag" ADD CONSTRAINT "_SymbolProfileToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SymbolProfileToTag" DROP CONSTRAINT IF EXISTS "_SymbolProfileToTag_B_fkey" ;
ALTER TABLE "_SymbolProfileToTag" ADD CONSTRAINT "_SymbolProfileToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
