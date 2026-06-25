-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('CASH_SAVINGS', 'EXPENSE', 'INVESTMENT_SAVINGS', 'LIABILITY_AUTOMATIC', 'YEARLY_EXPENSE_AUTOMATIC');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
  "accountId" TEXT,
  "accountUserId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "month" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "type" "BudgetType" NOT NULL DEFAULT 'EXPENSE',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
  "accountId" TEXT,
  "accountUserId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "categoryId" TEXT,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "id" TEXT NOT NULL,
  "merchant" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExpenseToTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,

  CONSTRAINT "_ExpenseToTag_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_userId_key" ON "ExpenseCategory"("name", "userId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_name_idx" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE INDEX "ExpenseCategory_userId_idx" ON "ExpenseCategory"("userId");

-- CreateIndex
CREATE INDEX "Budget_accountId_idx" ON "Budget"("accountId");

-- CreateIndex
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- CreateIndex
CREATE INDEX "Budget_month_idx" ON "Budget"("month");

-- CreateIndex
CREATE INDEX "Budget_type_idx" ON "Budget"("type");

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_currency_idx" ON "Expense"("currency");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_merchant_idx" ON "Expense"("merchant");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "_ExpenseToTag_B_index" ON "_ExpenseToTag"("B");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_accountId_accountUserId_fkey" FOREIGN KEY ("accountId", "accountUserId") REFERENCES "Account"("id", "userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_accountUserId_fkey" FOREIGN KEY ("accountId", "accountUserId") REFERENCES "Account"("id", "userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpenseToTag" ADD CONSTRAINT "_ExpenseToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpenseToTag" ADD CONSTRAINT "_ExpenseToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
