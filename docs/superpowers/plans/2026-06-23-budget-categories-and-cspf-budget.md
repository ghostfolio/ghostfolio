# Budget Categories and CSPF-Inspired Budget Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class expense category management and evolve the Budget page toward the CS Personal Finance Budget tab model: monthly budget lines, yearly expenses converted to monthly amounts, bank-account transfer summaries, and planned-vs-actual statistics.

**Architecture:** Keep expense categories user-owned and reusable across expenses and budgets. Treat each monthly budget row as a budget line with item name, amount, account, category, and type instead of only one amount per category. Yearly expenses are separate user-owned records that the API converts into automatic monthly budget rows and summary totals.

**Tech Stack:** Angular 21 standalone components, Angular Material table/dialog/form controls, NestJS, Prisma, PostgreSQL, Nx, Jest, Ghostfolio `DataService`, Ghostfolio permissions.

**Reference:** CS Personal Finance Budget guide: `https://guide.cspersonalfinance.io/summary-tabs/budget`

---

## What We Can Bring From CS Personal Finance

The source Budget tab has five useful concepts:

- Monthly budget table: item name, monthly amount, bank account, and category.
- Yearly expenses table: annual or irregular expenses converted into equivalent monthly cost.
- Automatic bank transfers: grouped view showing how much money needs to be sent to each bank account each month.
- Graphs and statistics: planned spend, actual spend, monthly savings, yearly savings, and estimated savings rate.
- Settings overview: read-only summary of assumptions used for calculations.

Ghostfolio can support these, but with app-native data models instead of spreadsheet cells:

- Expense categories become managed entities with create, edit, delete, color, and duplicate-name validation.
- Monthly budget rows become editable records in the Budget page.
- Yearly expenses become separate records and are displayed as automatic budget rows.
- Actual spend comes from the `Expense` table, using monthly totals and 6-month average actual spend.
- Account transfer summaries group monthly budget rows by `accountId`.

## Current State

- `ExpenseCategory`, `Expense`, and `Budget` Prisma models exist on this branch.
- Budget UI can create and edit monthly category budgets.
- Budget dialog now fetches existing categories, but there is no UI to create or manage categories.
- Budget rows are currently category-level only, so they cannot fully represent CS Personal Finance item-level budget rows yet.

## Recommended Scope

Build this in three slices:

1. Category management inside the Budget page.
2. Budget line upgrade: item name, account, category, amount, and budget type.
3. CSPF-inspired yearly expense and statistics sections.

This keeps each slice testable and usable without waiting for the full spreadsheet-style experience.

---

## File Structure

- Modify `prisma/schema.prisma`: extend `Budget`, add `BudgetType` enum, add `YearlyExpense`.
- Modify `libs/common/src/lib/dtos/`: add yearly expense DTOs and extend budget DTOs with `name`, `accountId`, and `type`.
- Modify `libs/common/src/lib/interfaces/responses/`: extend budget responses and add yearly expense/budget summary interfaces.
- Modify `apps/api/src/app/budgets/`: add category CRUD, budget line support, yearly expense support, and summary calculations.
- Modify `libs/ui/src/lib/services/data.service.ts`: add category CRUD and yearly expense methods.
- Modify `apps/client/src/app/pages/portfolio/budget/`: add category management dialog, yearly expense dialog, transfer summary, and statistics panels.

---

## Task 1: Add Category Management API

**Files:**

- Modify: `apps/api/src/app/budgets/budgets.controller.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.spec.ts`
- Modify: `libs/ui/src/lib/services/data.service.ts`
- Modify: `libs/ui/src/lib/services/data.service.spec.ts`

- [ ] **Step 1: Add failing service tests**

Add tests for:

```ts
it('creates an expense category for the current user');
it('rejects duplicate category names for the current user');
it('updates only categories owned by the current user');
it('deletes only categories owned by the current user');
```

Expected Prisma mocks:

```ts
expenseCategory.create;
expenseCategory.delete;
expenseCategory.findFirst;
expenseCategory.findMany;
expenseCategory.update;
```

- [ ] **Step 2: Add service methods**

Implement these methods in `BudgetsService`:

```ts
createCategory({ data, userId }: { data: CreateExpenseCategoryDto; userId: string })
updateCategory({ data, id, userId }: { data: UpdateExpenseCategoryDto; id: string; userId: string })
deleteCategory({ id, userId }: { id: string; userId: string })
```

Use `ConflictException` when a category name already exists for the same user. Use `ForbiddenException` when the category does not belong to the user.

- [ ] **Step 3: Add controller endpoints**

Add:

```ts
POST /api/v1/budgets/categories
PUT /api/v1/budgets/categories/:id
DELETE /api/v1/budgets/categories/:id
```

Permissions:

```ts
createExpenseCategory;
updateExpenseCategory;
deleteExpenseCategory;
```

- [ ] **Step 4: Add client service methods**

Add to `DataService`:

```ts
createExpenseCategory(category: CreateExpenseCategoryDto)
updateExpenseCategory({ category, id }: { category: UpdateExpenseCategoryDto; id: string })
deleteExpenseCategory(id: string)
```

- [ ] **Step 5: Verify**

Run:

```bash
./node_modules/.bin/nx test api --testFile=budgets.service.spec.ts --runInBand
./node_modules/.bin/nx test ui --testFile=data.service.spec.ts --runInBand
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/budgets libs/ui/src/lib/services/data.service.ts libs/ui/src/lib/services/data.service.spec.ts
git commit -m "feat: add budget category management api"
```

---

## Task 2: Add Category Management UI

**Files:**

- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.html`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.html`
- Create: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.scss`
- Create: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts`

- [ ] **Step 1: Add a Manage Categories button**

Place a secondary button near `Create budget`:

```html
<button mat-stroked-button type="button" (click)="onManageCategories()">
  Manage categories
</button>
```

- [ ] **Step 2: Build the dialog**

The dialog should show:

- Category name input.
- Optional color input.
- Create button.
- Table/list of existing categories.
- Edit and delete icon buttons.

Use `MatDialogModule`, `MatFormFieldModule`, `MatInputModule`, `MatButtonModule`, `MatIconModule`, and `MatTableModule`.

- [ ] **Step 3: Refresh budget dialog category list**

After categories are created or edited, closing the category dialog with `{ refresh: true }` should allow the next Budget dialog open to fetch the latest categories.

- [ ] **Step 4: Verify**

Run:

```bash
./node_modules/.bin/nx test client --testFile=manage-budget-categories-dialog.component.spec.ts --runInBand
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts --runInBand
```

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/pages/portfolio/budget
git commit -m "feat: add budget category management ui"
```

---

## Task 3: Upgrade Budget Rows Into Monthly Budget Lines

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `libs/common/src/lib/dtos/create-budget.dto.ts`
- Modify: `libs/common/src/lib/dtos/update-budget.dto.ts`
- Modify: `libs/common/src/lib/interfaces/responses/budget-response.interface.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.spec.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/*`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.*`

- [ ] **Step 1: Extend the Prisma model**

Add:

```prisma
enum BudgetType {
  EXPENSE
  CASH_SAVINGS
  INVESTMENT_SAVINGS
  YEARLY_EXPENSE_AUTOMATIC
  LIABILITY_AUTOMATIC
}
```

Extend `Budget`:

```prisma
account       Account?   @relation(fields: [accountId, accountUserId], references: [id, userId])
accountId     String?
accountUserId String?
name          String
type          BudgetType @default(EXPENSE)
```

Replace the current unique category/month constraint with:

```prisma
@@index([accountId])
@@index([type])
```

Keep the existing indexes on `categoryId`, `month`, and `userId`.

- [ ] **Step 2: Update contracts**

Add to create/update DTOs:

```ts
accountId?: string;
name: string;
type: 'EXPENSE' | 'CASH_SAVINGS' | 'INVESTMENT_SAVINGS';
```

Do not allow clients to submit automatic types directly.

- [ ] **Step 3: Update API calculations**

`getBudgets()` should return manual monthly budget lines plus automatic yearly expense rows from Task 4. Totals should calculate:

```ts
totalBudgeted = sum(all row amounts)
totalPlannedSpend = sum(EXPENSE + YEARLY_EXPENSE_AUTOMATIC + LIABILITY_AUTOMATIC)
totalMonthlySavings = sum(CASH_SAVINGS + INVESTMENT_SAVINGS)
totalRemaining = totalBudgeted - totalSpent
```

- [ ] **Step 4: Update UI table columns**

Columns should become:

```ts
[
  'name',
  'category',
  'account',
  'type',
  'amount',
  'spent',
  'remaining',
  'progress',
  'actions'
];
```

The dialog should ask for item name, account, category, type, month, and amount.

- [ ] **Step 5: Verify**

Run:

```bash
./node_modules/.bin/nx test api --testFile=budgets.service.spec.ts --runInBand
./node_modules/.bin/nx test client --testFile=create-or-update-budget-dialog.component.spec.ts --runInBand
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts --runInBand
./node_modules/.bin/nx run api:build
./node_modules/.bin/nx run client:build:development-en
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma libs/common apps/api/src/app/budgets apps/client/src/app/pages/portfolio/budget
git commit -m "feat: support monthly budget lines"
```

---

## Task 4: Add Yearly Expenses

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `libs/common/src/lib/dtos/create-yearly-expense.dto.ts`
- Create: `libs/common/src/lib/dtos/update-yearly-expense.dto.ts`
- Modify: `libs/common/src/lib/dtos/index.ts`
- Create: `libs/common/src/lib/interfaces/responses/yearly-expense-response.interface.ts`
- Modify: `libs/common/src/lib/interfaces/index.ts`
- Modify: `apps/api/src/app/budgets/budgets.controller.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.spec.ts`
- Modify: `libs/ui/src/lib/services/data.service.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/*`

- [ ] **Step 1: Add Prisma model**

```prisma
model YearlyExpense {
  account       Account?        @relation(fields: [accountId, accountUserId], references: [id, userId])
  accountId     String?
  accountUserId String?
  category      ExpenseCategory @relation(fields: [categoryId], onDelete: Cascade, references: [id])
  categoryId    String
  createdAt     DateTime        @default(now())
  currency      String
  id            String          @id @default(uuid())
  name          String
  updatedAt     DateTime        @updatedAt
  user          User            @relation(fields: [userId], onDelete: Cascade, references: [id])
  userId        String
  yearlyCost    Float

  @@index([accountId])
  @@index([categoryId])
  @@index([userId])
}
```

- [ ] **Step 2: Add yearly expense endpoints**

Add:

```ts
GET /api/v1/budgets/yearly-expenses
POST /api/v1/budgets/yearly-expenses
PUT /api/v1/budgets/yearly-expenses/:id
DELETE /api/v1/budgets/yearly-expenses/:id
```

Use budget permissions for now:

```ts
readBudgets;
createBudget;
updateBudget;
deleteBudget;
```

- [ ] **Step 3: Include automatic rows in `getBudgets()`**

For each yearly expense, emit an automatic budget row:

```ts
amount = yearlyCost / 12;
type = 'YEARLY_EXPENSE_AUTOMATIC';
name = `${yearlyExpense.name} (yearly)`;
```

These rows should not be editable from the monthly budget table. They are edited in the Yearly Expenses table.

- [ ] **Step 4: Add Yearly Expenses UI section**

Below the monthly table, add a compact table:

```ts
['name', 'category', 'account', 'yearlyCost', 'monthlyEquivalent', 'actions'];
```

Add create/edit dialog with fields:

- Name
- Category
- Account
- Yearly cost

- [ ] **Step 5: Verify and commit**

Run the same API/client tests and builds from Task 3, then commit:

```bash
git commit -m "feat: add yearly budget expenses"
```

---

## Task 5: Add Transfer Summary and Budget Statistics

**Files:**

- Modify: `libs/common/src/lib/interfaces/responses/budget-response.interface.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.ts`
- Modify: `apps/api/src/app/budgets/budgets.service.spec.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.html`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.scss`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`

- [ ] **Step 1: Extend `BudgetsResponse`**

Add:

```ts
actualSpendAverage: number;
estimatedSavingsRate: number;
totalMonthlySavings: number;
totalPlannedSpend: number;
totalYearlySavings: number;
transfers: Array<{
  accountId?: string;
  accountName: string;
  amount: number;
}>;
```

- [ ] **Step 2: Calculate 6-month actual spend**

In `BudgetsService`, calculate actual spend as the average monthly sum of `Expense.amount` over the six months ending with the selected month.

- [ ] **Step 3: Calculate transfer rows**

Group all monthly and yearly automatic budget rows by account:

```ts
transfers = rows.reduce((byAccount, row) => {
  byAccount[row.accountId ?? 'unassigned'] += row.amount;
  return byAccount;
}, {});
```

- [ ] **Step 4: Render stats and transfer summary**

Add top summary metrics:

- Planned spend
- Actual spend average
- Monthly savings
- Yearly savings
- Estimated savings rate

Add a compact transfer table:

```ts
['account', 'amount'];
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
./node_modules/.bin/nx test api --testFile=budgets.service.spec.ts --runInBand
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts --runInBand
./node_modules/.bin/nx run client:build:development-en
git commit -m "feat: add budget transfer summary and statistics"
```

---

## Task 6: Final Verification

- [ ] **Run focused tests**

```bash
./node_modules/.bin/nx test api --testFile=budgets.service.spec.ts --runInBand
./node_modules/.bin/nx test ui --testFile=data.service.spec.ts --runInBand
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts --runInBand
./node_modules/.bin/nx test client --testFile=create-or-update-budget-dialog.component.spec.ts --runInBand
```

- [ ] **Run builds**

```bash
./node_modules/.bin/nx run api:build
./node_modules/.bin/nx run client:build:development-en
```

- [ ] **Manual browser check**

Start the dev server and verify:

- Budget page loads.
- Manage categories opens.
- A category can be created.
- A monthly budget line can be created using that category.
- A yearly expense appears as monthly equivalent.
- Transfer summary groups rows by account.
- Stats update when changing month.
