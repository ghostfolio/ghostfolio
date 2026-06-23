# Budget Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly category budgets to Ghostfolio with UI summaries and authenticated public integration endpoints.

**Architecture:** Budgets are first-class user-owned records linked to expense categories from the Expenses feature. Budget actuals are calculated from `Expense` rows in the same category and month, so this plan depends on the Expenses feature plan being implemented first. External apps authenticate with `Authorization: Api-Key <api_key>`; the Angular app continues to use JWT bearer auth.

**Tech Stack:** Angular 21, Angular Material, NestJS, Prisma, PostgreSQL, Nx, Jest.

---

## File Structure

- Modify `prisma/schema.prisma`: add `Budget` and relation to `ExpenseCategory` and `User`.
- Create DTOs in `libs/common/src/lib/dtos/`: `create-budget.dto.ts`, `update-budget.dto.ts`; export from `index.ts`.
- Create response interfaces in `libs/common/src/lib/interfaces/responses/`: `budget-response.interface.ts`; export from `libs/common/src/lib/interfaces/index.ts`.
- Modify `libs/common/src/lib/permissions.ts`: add budget read/write permissions and grant them to `ADMIN` and `USER`.
- Create API files under `apps/api/src/app/budgets/`: `budgets.module.ts`, `budgets.controller.ts`, `budgets.service.ts`, `budgets.service.spec.ts`.
- Modify `apps/api/src/app/app.module.ts`: import `BudgetsModule`.
- Modify `libs/ui/src/lib/services/data.service.ts`: add budget client methods.
- Modify `libs/common/src/lib/routes/routes.ts`: add `internalRoutes.portfolio.subRoutes.budget`.
- Modify `apps/client/src/app/pages/portfolio/portfolio-page.component.ts`: add Budget tab.
- Modify `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts`: add lazy child route.
- Create Angular feature files under `apps/client/src/app/pages/portfolio/budget/`: `budget-page.routes.ts`, `budget-page.component.ts`, `budget-page.html`, `budget-page.scss`, `create-or-update-budget-dialog/*`.

## Task 1: Shared Budget Contracts

**Files:**

- Modify: `libs/common/src/lib/permissions.ts`
- Create: `libs/common/src/lib/dtos/create-budget.dto.ts`
- Create: `libs/common/src/lib/dtos/update-budget.dto.ts`
- Modify: `libs/common/src/lib/dtos/index.ts`
- Create: `libs/common/src/lib/interfaces/responses/budget-response.interface.ts`
- Modify: `libs/common/src/lib/interfaces/index.ts`

- [ ] **Step 1: Add permissions**

Add these permission constants:

```ts
createBudget: 'createBudget',
deleteBudget: 'deleteBudget',
readBudgets: 'readBudgets',
updateBudget: 'updateBudget',
```

Add all four permissions to `ADMIN` and `USER`. Do not add them to `DEMO`.

- [ ] **Step 2: Add DTOs**

Use these DTOs exactly:

```ts
// create-budget.dto.ts
export class CreateBudgetDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  categoryId: string;

  @IsCurrencyCode()
  currency: string;

  @Matches(/^\d{4}-\d{2}$/)
  month: string;
}
```

```ts
// update-budget.dto.ts
export class UpdateBudgetDto extends CreateBudgetDto {
  @IsString()
  id: string;
}
```

- [ ] **Step 3: Add response interfaces**

```ts
import { ExpenseCategoryResponse } from './expense-category-response.interface';

export interface BudgetResponse {
  amount: number;
  category: ExpenseCategoryResponse;
  categoryId: string;
  createdAt: Date;
  currency: string;
  id: string;
  month: string;
  remaining: number;
  spent: number;
  updatedAt: Date;
}

export interface BudgetsResponse {
  budgets: BudgetResponse[];
  totalBudgeted: number;
  totalRemaining: number;
  totalSpent: number;
}
```

- [ ] **Step 4: Run common tests**

Run:

```bash
npm run test:common
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/common/src/lib
git commit -m "feat: add budget contracts"
```

## Task 2: Prisma Budget Schema

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Budget model**

Add:

```prisma
model Budget {
  amount     Float
  category   ExpenseCategory @relation(fields: [categoryId], onDelete: Cascade, references: [id])
  categoryId String
  createdAt  DateTime        @default(now())
  currency   String
  id         String          @id @default(uuid())
  month      DateTime
  updatedAt  DateTime        @updatedAt
  user       User            @relation(fields: [userId], onDelete: Cascade, references: [id])
  userId     String

  @@unique([categoryId, month, userId])
  @@index([categoryId])
  @@index([month])
  @@index([userId])
}
```

Add relation fields:

```prisma
model ExpenseCategory {
  budgets Budget[]
}

model User {
  budgets Budget[]
}
```

- [ ] **Step 2: Format and validate schema**

Run:

```bash
npm run database:format-schema
npm run database:validate-schema
```

Expected: PASS.

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run database:generate-typings
```

Expected: PASS and Prisma types include `Budget`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add budget prisma model"
```

## Task 3: Budget API

**Files:**

- Create: `apps/api/src/app/budgets/budgets.service.ts`
- Create: `apps/api/src/app/budgets/budgets.service.spec.ts`
- Create: `apps/api/src/app/budgets/budgets.controller.ts`
- Create: `apps/api/src/app/budgets/budgets.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Write failing service tests**

Create tests covering:

```ts
it('lists budgets for a month and includes spent and remaining amounts');
it('creates a budget for a category owned by the current user');
it('updates only a budget owned by the current user');
it('deletes only a budget owned by the current user');
it('rejects duplicate budgets for the same category and month');
```

Mock `PrismaService` methods:

```ts
budget.findMany;
budget.create;
budget.update;
budget.delete;
budget.findFirst;
expense.groupBy;
expenseCategory.findFirst;
```

- [ ] **Step 2: Run failing test**

Run:

```bash
nx test api --testFile=budgets.service.spec.ts
```

Expected: FAIL because `BudgetsService` does not exist.

- [ ] **Step 3: Implement month helpers**

Inside `BudgetsService`, implement:

```ts
private parseBudgetMonth(month: string): Date {
  return new Date(`${month}-01T00:00:00.000Z`);
}

private formatBudgetMonth(month: Date): string {
  return month.toISOString().slice(0, 7);
}
```

- [ ] **Step 4: Implement service methods**

Implement:

```ts
getBudgets({ month, userId }: { month: string; userId: string })
getBudget({ id, userId }: { id: string; userId: string })
createBudget({ data, userId }: { data: CreateBudgetDto; userId: string })
updateBudget({ data, id, userId }: { data: UpdateBudgetDto; id: string; userId: string })
deleteBudget({ id, userId }: { id: string; userId: string })
```

Rules:

- Always scope by `userId`.
- Verify the category belongs to the user before create/update.
- Store `month` as the first day of that month in UTC.
- Calculate `spent` from expenses where `date >= monthStart`, `date < nextMonthStart`, `categoryId` matches, and `userId` matches.
- Calculate `remaining = amount - spent`.
- Return summary totals in `BudgetsResponse`.

- [ ] **Step 5: Implement controller**

Add routes:

```http
GET    /api/v1/budgets?month=2026-06
POST   /api/v1/budgets
GET    /api/v1/budgets/:id
PUT    /api/v1/budgets/:id
DELETE /api/v1/budgets/:id
```

Use:

```ts
@UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
```

Apply permissions:

```ts
readBudgets;
createBudget;
updateBudget;
deleteBudget;
```

External integration request example:

```bash
curl -H "Authorization: Api-Key $GHOSTFOLIO_API_KEY" \
  "https://example.com/api/v1/budgets?month=2026-06"
```

- [ ] **Step 6: Register module**

Import `BudgetsModule` in `apps/api/src/app/app.module.ts`.

- [ ] **Step 7: Run API tests**

Run:

```bash
nx test api --testFile=budgets.service.spec.ts
npm run test:api
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/app/budgets apps/api/src/app/app.module.ts
git commit -m "feat: add budgets api"
```

## Task 4: Angular Data Service

**Files:**

- Modify: `libs/ui/src/lib/services/data.service.ts`

- [ ] **Step 1: Add imports**

Import `CreateBudgetDto`, `UpdateBudgetDto`, `BudgetResponse`, and `BudgetsResponse`.

- [ ] **Step 2: Add data methods**

```ts
public fetchBudgets({ month }: { month: string }) {
  let params = new HttpParams();
  params = params.append('month', month);

  return this.http.get<BudgetsResponse>('/api/v1/budgets', { params });
}

public postBudget(aBudget: CreateBudgetDto) {
  return this.http.post<BudgetResponse>('/api/v1/budgets', aBudget);
}

public putBudget(aBudget: UpdateBudgetDto) {
  return this.http.put<BudgetResponse>(`/api/v1/budgets/${aBudget.id}`, aBudget);
}

public deleteBudget(aId: string) {
  return this.http.delete<BudgetResponse>(`/api/v1/budgets/${aId}`);
}
```

- [ ] **Step 3: Run UI library lint**

Run:

```bash
nx run ui:lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add libs/ui/src/lib/services/data.service.ts
git commit -m "feat: add budget data service methods"
```

## Task 5: Budget Portfolio Tab UI

**Files:**

- Modify: `libs/common/src/lib/routes/routes.ts`
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.routes.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.html`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.scss`

- [ ] **Step 1: Add route metadata**

Add:

```ts
budget: {
  path: 'budget',
  routerLink: ['/portfolio', 'budget'],
  title: $localize`Budget`
}
```

- [ ] **Step 2: Add tab**

In `PortfolioPageComponent`, import an icon such as `walletOutline` from `ionicons/icons`, register it with `addIcons`, and add:

```ts
{
  iconName: 'wallet-outline',
  label: internalRoutes.portfolio.subRoutes.budget.title,
  routerLink: internalRoutes.portfolio.subRoutes.budget.routerLink
}
```

- [ ] **Step 3: Add lazy route**

Add child route:

```ts
{
  path: internalRoutes.portfolio.subRoutes.budget.path,
  loadChildren: () =>
    import('./budget/budget-page.routes').then((m) => m.routes)
}
```

- [ ] **Step 4: Implement page**

The page must:

- default to the current month formatted as `YYYY-MM`
- fetch categories through `fetchExpenseCategories()`
- fetch budgets through `fetchBudgets({ month })`
- show total budgeted, total spent, and total remaining
- show a Material table with category, budget amount, spent, remaining, and actions
- open a create/edit dialog for budgets

- [ ] **Step 5: Run client checks**

Run:

```bash
nx run client:lint
nx run client:build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/common/src/lib/routes/routes.ts apps/client/src/app/pages/portfolio
git commit -m "feat: add budget portfolio tab"
```

## Task 6: Budget Dialog

**Files:**

- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.html`
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.scss`

- [ ] **Step 1: Implement dialog form**

Use Reactive Forms with fields:

```ts
(amount, categoryId, currency, month);
```

Required fields:

```ts
(amount, categoryId, currency, month);
```

- [ ] **Step 2: Validate unique category per month in UI**

When creating a budget, hide or disable categories that already have a budget for the selected month.

- [ ] **Step 3: Wire dialog to page**

After create/update/delete, refresh budgets and call `markForCheck()`.

- [ ] **Step 4: Run client checks**

Run:

```bash
nx run client:lint
nx run client:build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/pages/portfolio/budget
git commit -m "feat: add budget management dialog"
```

## Task 7: Final Verification

- [ ] **Step 1: Run schema checks**

```bash
npm run database:validate-schema
```

Expected: PASS.

- [ ] **Step 2: Run focused tests**

```bash
npm run test:common
npm run test:api
```

Expected: PASS.

- [ ] **Step 3: Run production build**

```bash
npm run build:production
```

Expected: PASS.

- [ ] **Step 4: Manual API verification**

Create an API key from the existing API page, then run:

```bash
curl -H "Authorization: Api-Key $GHOSTFOLIO_API_KEY" \
  "http://localhost:3333/api/v1/budgets?month=2026-06"
```

Expected: `200 OK` and a `BudgetsResponse`.

- [ ] **Step 5: Manual UI verification**

Start the app:

```bash
npm run start:server
npm run start:client
```

Open `https://localhost:4200/en/portfolio/budget`. Confirm the Budget tab appears, budgets can be created for expense categories, totals update after expenses are added, and duplicate category/month budgets are prevented.

## Self-Review

- Spec coverage: first-class budget records, UI tab, CRUD API, API-key integration, JWT UI access, user isolation, month summaries, and dependency on expenses are covered.
- Placeholder scan: no placeholder markers or unassigned implementation decisions remain.
- Type consistency: DTO names, route names, permission names, response names, and dependency on `ExpenseCategory` match across tasks.
