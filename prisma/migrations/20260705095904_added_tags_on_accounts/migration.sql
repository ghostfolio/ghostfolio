-- CreateTable
CREATE TABLE "TagsOnAccounts" (
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tagId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TagsOnAccounts_pkey" PRIMARY KEY ("accountId","tagId","userId")
);

-- CreateIndex
CREATE INDEX "TagsOnAccounts_tagId_idx" ON "TagsOnAccounts"("tagId");

-- AddForeignKey
ALTER TABLE "TagsOnAccounts" ADD CONSTRAINT "TagsOnAccounts_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "Account"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagsOnAccounts" ADD CONSTRAINT "TagsOnAccounts_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

