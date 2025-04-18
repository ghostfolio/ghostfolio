-- CreateTable
CREATE TABLE "_UserWatchlist" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,

  CONSTRAINT "_UserWatchlist_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserWatchlist_B_index" ON "_UserWatchlist"("B");

-- AddForeignKey
ALTER TABLE "_UserWatchlist" ADD CONSTRAINT "_UserWatchlist_A_fkey" FOREIGN KEY ("A") REFERENCES "SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserWatchlist" ADD CONSTRAINT "_UserWatchlist_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
