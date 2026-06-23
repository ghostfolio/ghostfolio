# Expenses Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class expense tracking to Ghostfolio with Angular UI and authenticated public integration endpoints.

**Architecture:** Expenses are separate from investment `Order` activities. The feature introduces user-owned `ExpenseCategory` and `Expense` Prisma models, shared DTOs/interfaces in `libs/common`, NestJS API modules under `/api/v1`, and a Portfolio tab using the existing `gf-page-tabs` pattern. External apps authenticate with `Authorization: Api-Key <api_key>`; the Angular app continues to use JWT bearer auth.

**Tech Stack:** Angular 21, Angular Material, NestJS, Prisma, PostgreSQL, Nx, Jest.

---

## File Structure

- Modify `prisma/schema.prisma`: add `ExpenseCategory`, `Expense`, user/account/tag relations.
- Modify `libs/common/src/lib/permissions.ts`: add expense permissions and grant them to `ADMIN` and `USER`.
- Create DTOs in `libs/common/src/lib/dtos/`: `create-expense-category.dto.ts`, `update-expense-category.dto.ts`, `create-expense.dto.ts`, `update-expense.dto.ts`; export from `index.ts`.
- Create response interfaces in `libs/common/src/lib/interfaces/responses/`: `expense-category-response.interface.ts`, `expenses-response.interface.ts`; export from `libs/common/src/lib/interfaces/index.ts`.
- Create API module files under `apps/api/src/app/expenses/`: `expenses.module.ts`, `expenses.controller.ts`, `expenses.service.ts`, `expenses.service.spec.ts`, `expense-categories.controller.ts`, `expense-categories.service.ts`, `expense-categories.service.spec.ts`.
- Create `apps/api/src/guards/jwt-or-api-key-auth.guard.ts` to support JWT and API-key integrations on the new endpoints.
- Modify `apps/api/src/app/app.module.ts`: import `ExpensesModule`.
- Modify `libs/ui/src/lib/services/data.service.ts`: add expense category and expense client methods.
- Modify `libs/common/src/lib/routes/routes.ts`: add `internalRoutes.portfolio.subRoutes.expenses`.
- Modify `apps/client/src/app/pages/portfolio/portfolio-page.component.ts`: add Expenses tab.
- Modify `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts`: add lazy child route.
- Create Angular feature files under `apps/client/src/app/pages/portfolio/expenses/`: `expenses-page.routes.ts`, `expenses-page.component.ts`, `expenses-page.html`, `expenses-page.scss`, `create-or-update-expense-dialog/*`, `create-or-update-expense-category-dialog/*`.

## Task 1: Shared Expense Contracts

**Files:**

- Modify: `libs/common/src/lib/permissions.ts`
- Create: `libs/common/src/lib/dtos/create-expense-category.dto.ts`
- Create: `libs/common/src/lib/dtos/update-expense-category.dto.ts`
- Create: `libs/common/src/lib/dtos/create-expense.dto.ts`
- Create: `libs/common/src/lib/dtos/update-expense.dto.ts`
- Modify: `libs/common/src/lib/dtos/index.ts`
- Create: `libs/common/src/lib/interfaces/responses/expense-category-response.interface.ts`
- Create: `libs/common/src/lib/interfaces/responses/expenses-response.interface.ts`
- Modify: `libs/common/src/lib/interfaces/index.ts`

- [ ] **Step 1: Add permissions**

Add these permission constants to `permissions`:

```ts
createExpense: 'createExpense',
createExpenseCategory: 'createExpenseCategory',
deleteExpense: 'deleteExpense',
deleteExpenseCategory: 'deleteExpenseCategory',
readExpenses: 'readExpenses',
readExpenseCategories: 'readExpenseCategories',
updateExpense: 'updateExpense',
updateExpenseCategory: 'updateExpenseCategory',
```

Add all eight permissions to `ADMIN` and `USER`. Do not add them to `DEMO`.

- [ ] **Step 2: Add DTO files**

Use these DTO shapes exactly:

```ts
// create-expense-category.dto.ts
export class CreateExpenseCategoryDto {
  @IsString()
  name: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}
```

```ts
// update-expense-category.dto.ts
export class UpdateExpenseCategoryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}
```

```ts
// create-expense.dto.ts
export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  accountId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsCurrencyCode()
  currency: string;

  @IsISO8601()
  date: string;

  @IsString()
  @IsOptional()
  merchant?: string;

  @IsArray()
  @IsOptional()
  tagIds?: string[];
}
```

```ts
// update-expense.dto.ts
export class UpdateExpenseDto extends CreateExpenseDto {
  @IsString()
  id: string;
}
```

- [ ] **Step 3: Add response interfaces**

Use these response contracts:

```ts
export interface ExpenseCategoryResponse {
  color?: string;
  createdAt: Date;
  id: string;
  name: string;
  updatedAt: Date;
}
```

```ts
import { Account, Tag } from '@prisma/client';

export interface ExpenseResponse {
  account?: Account;
  accountId?: string;
  amount: number;
  categoryId?: string;
  comment?: string;
  createdAt: Date;
  currency: string;
  date: Date;
  id: string;
  merchant?: string;
  tags: Tag[];
  updatedAt: Date;
}

export interface ExpensesResponse {
  count: number;
  expenses: ExpenseResponse[];
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
git commit -m "feat: add expense contracts"
```

## Task 2: Prisma Expense Schema

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Prisma models**

Add these models and relations:

```prisma
model ExpenseCategory {
  color     String?
  createdAt DateTime  @default(now())
  expenses  Expense[]
  id        String    @id @default(uuid())
  name      String
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], onDelete: Cascade, references: [id])
  userId    String

  @@unique([name, userId])
  @@index([name])
  @@index([userId])
}

model Expense {
  account    Account?         @relation(fields: [accountId, accountUserId], references: [id, userId])
  accountId  String?
  accountUserId String?
  amount     Float
  category   ExpenseCategory? @relation(fields: [categoryId], onDelete: SetNull, references: [id])
  categoryId String?
  comment    String?
  createdAt  DateTime         @default(now())
  currency   String
  date       DateTime
  id         String           @id @default(uuid())
  merchant   String?
  tags       Tag[]
  updatedAt  DateTime         @updatedAt
  user       User             @relation(fields: [userId], onDelete: Cascade, references: [id])
  userId     String

  @@index([accountId])
  @@index([categoryId])
  @@index([currency])
  @@index([date])
  @@index([merchant])
  @@index([userId])
}
```

Add relation fields:

```prisma
model Account {
  expenses Expense[]
}

model Tag {
  expenses Expense[]
}

model User {
  expenseCategories ExpenseCategory[]
  expenses          Expense[]
}
```

- [ ] **Step 2: Format and validate schema**

Run:

```bash
npm run database:format-schema
npm run database:validate-schema
```

Expected: both commands PASS.

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run database:generate-typings
```

Expected: PASS and Prisma types include `Expense` and `ExpenseCategory`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add expense prisma models"
```

## Task 3: JWT Or API-Key Guard

**Files:**

- Create: `apps/api/src/guards/jwt-or-api-key-auth.guard.ts`

- [ ] **Step 1: Create the guard**

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOrApiKeyAuthGuard implements CanActivate {
  private readonly jwtGuard = new (AuthGuard('jwt'))();
  private readonly apiKeyGuard = new (AuthGuard('api-key'))();

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await this.jwtGuard.canActivate(context)) as boolean;
    } catch {
      return (await this.apiKeyGuard.canActivate(context)) as boolean;
    }
  }
}
```

- [ ] **Step 2: Build API**

Run:

```bash
nx run api:build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/guards/jwt-or-api-key-auth.guard.ts
git commit -m "feat: support jwt or api key auth"
```

## Task 4: Expense Category API

**Files:**

- Create: `apps/api/src/app/expenses/expense-categories.service.ts`
- Create: `apps/api/src/app/expenses/expense-categories.service.spec.ts`
- Create: `apps/api/src/app/expenses/expense-categories.controller.ts`

- [ ] **Step 1: Write failing service tests**

Create tests covering:

```ts
it('returns only categories for the current user');
it('creates a category for the current user');
it('updates only a category owned by the current user');
it('blocks deletion when expenses reference the category');
it('deletes an unused category owned by the current user');
```

Mock `PrismaService` with `expenseCategory.findMany`, `expenseCategory.create`, `expenseCategory.update`, `expenseCategory.delete`, and `expense.count`.

- [ ] **Step 2: Run failing test**

Run:

```bash
nx test api --testFile=expense-categories.service.spec.ts
```

Expected: FAIL because the service does not exist yet.

- [ ] **Step 3: Implement service**

Implement methods:

```ts
getCategories({ userId }: { userId: string })
createCategory({ data, userId }: { data: CreateExpenseCategoryDto; userId: string })
updateCategory({ data, id, userId }: { data: UpdateExpenseCategoryDto; id: string; userId: string })
deleteCategory({ id, userId }: { id: string; userId: string })
```

Deletion must check `expense.count({ where: { categoryId: id, userId } })`; if count is greater than `0`, throw `HttpException(CONFLICT, 409)`.

- [ ] **Step 4: Implement controller**

Add routes:

```http
GET    /api/v1/expense-categories
POST   /api/v1/expense-categories
PUT    /api/v1/expense-categories/:id
DELETE /api/v1/expense-categories/:id
```

Use:

```ts
@UseGuards(JwtOrApiKeyAuthGuard, HasPermissionGuard)
```

Apply permissions:

```ts
readExpenseCategories;
createExpenseCategory;
updateExpenseCategory;
deleteExpenseCategory;
```

- [ ] **Step 5: Run service tests**

Run:

```bash
nx test api --testFile=expense-categories.service.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/expenses apps/api/src/guards
git commit -m "feat: add expense category api"
```

## Task 5: Expense API

**Files:**

- Create: `apps/api/src/app/expenses/expenses.service.ts`
- Create: `apps/api/src/app/expenses/expenses.service.spec.ts`
- Create: `apps/api/src/app/expenses/expenses.controller.ts`
- Create: `apps/api/src/app/expenses/expenses.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Write failing service tests**

Create tests covering:

```ts
it('lists paginated expenses for the current user');
it('filters expenses by date range and category');
it('creates an expense with optional account, category, and tags');
it('updates only an expense owned by the current user');
it('deletes only an expense owned by the current user');
```

- [ ] **Step 2: Run failing test**

Run:

```bash
nx test api --testFile=expenses.service.spec.ts
```

Expected: FAIL because `ExpensesService` does not exist.

- [ ] **Step 3: Implement service**

Implement methods:

```ts
getExpenses({
  categoryId,
  from,
  skip,
  sortColumn = 'date',
  sortDirection = 'desc',
  take,
  to,
  userId
});
getExpense({ id, userId });
createExpense({ data, userId });
updateExpense({ data, id, userId });
deleteExpense({ id, userId });
```

Always scope Prisma `where` clauses by `userId`. Include `account`, `category`, and `tags` in returned expenses.

- [ ] **Step 4: Implement controller**

Add routes:

```http
GET    /api/v1/expenses?from=2026-06-01&to=2026-06-30&categoryId=...&skip=0&take=50
POST   /api/v1/expenses
GET    /api/v1/expenses/:id
PUT    /api/v1/expenses/:id
DELETE /api/v1/expenses/:id
```

Use `JwtOrApiKeyAuthGuard` and `HasPermissionGuard`.

Apply permissions:

```ts
readExpenses;
createExpense;
updateExpense;
deleteExpense;
```

External integration request example:

```bash
curl -H "Authorization: Api-Key $GHOSTFOLIO_API_KEY" \
  "https://example.com/api/v1/expenses?from=2026-06-01&to=2026-06-30"
```

- [ ] **Step 5: Register module**

Import `ExpensesModule` in `apps/api/src/app/app.module.ts`.

- [ ] **Step 6: Run tests**

Run:

```bash
nx test api --testFile=expenses.service.spec.ts
npm run test:api
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app/expenses apps/api/src/app/app.module.ts
git commit -m "feat: add expenses api"
```

## Task 6: Angular Data Service

**Files:**

- Modify: `libs/ui/src/lib/services/data.service.ts`

- [ ] **Step 1: Add imports**

Import the new DTOs and response interfaces from `@ghostfolio/common`.

- [ ] **Step 2: Add category methods**

```ts
public fetchExpenseCategories() {
  return this.http.get<ExpenseCategoryResponse[]>('/api/v1/expense-categories');
}

public postExpenseCategory(aCategory: CreateExpenseCategoryDto) {
  return this.http.post<ExpenseCategoryResponse>('/api/v1/expense-categories', aCategory);
}

public putExpenseCategory(aCategory: UpdateExpenseCategoryDto) {
  return this.http.put<ExpenseCategoryResponse>(
    `/api/v1/expense-categories/${aCategory.id}`,
    aCategory
  );
}

public deleteExpenseCategory(aId: string) {
  return this.http.delete<ExpenseCategoryResponse>(`/api/v1/expense-categories/${aId}`);
}
```

- [ ] **Step 3: Add expense methods**

```ts
public fetchExpenses({ categoryId, from, skip, sortColumn, sortDirection, take, to }) {
  let params = new HttpParams();
  if (categoryId) params = params.append('categoryId', categoryId);
  if (from) params = params.append('from', format(from, DATE_FORMAT, { in: utc }));
  if (to) params = params.append('to', format(to, DATE_FORMAT, { in: utc }));
  if (skip) params = params.append('skip', skip);
  if (sortColumn) params = params.append('sortColumn', sortColumn);
  if (sortDirection) params = params.append('sortDirection', sortDirection);
  if (take) params = params.append('take', take);
  return this.http.get<ExpensesResponse>('/api/v1/expenses', { params });
}

public postExpense(aExpense: CreateExpenseDto) {
  return this.http.post<ExpenseResponse>('/api/v1/expenses', aExpense);
}

public putExpense(aExpense: UpdateExpenseDto) {
  return this.http.put<ExpenseResponse>(`/api/v1/expenses/${aExpense.id}`, aExpense);
}

public deleteExpense(aId: string) {
  return this.http.delete<ExpenseResponse>(`/api/v1/expenses/${aId}`);
}
```

- [ ] **Step 4: Build UI library**

Run:

```bash
nx run ui:lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/ui/src/lib/services/data.service.ts
git commit -m "feat: add expense data service methods"
```

## Task 7: Expenses Portfolio Tab UI

**Files:**

- Modify: `libs/common/src/lib/routes/routes.ts`
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts`
- Create: `apps/client/src/app/pages/portfolio/expenses/expenses-page.routes.ts`
- Create: `apps/client/src/app/pages/portfolio/expenses/expenses-page.component.ts`
- Create: `apps/client/src/app/pages/portfolio/expenses/expenses-page.html`
- Create: `apps/client/src/app/pages/portfolio/expenses/expenses-page.scss`

- [ ] **Step 1: Add route metadata**

Add:

```ts
expenses: {
  path: 'expenses',
  routerLink: ['/portfolio', 'expenses'],
  title: $localize`Expenses`
}
```

- [ ] **Step 2: Add tab**

In `PortfolioPageComponent`, import an icon such as `receiptOutline` from `ionicons/icons`, register it with `addIcons`, and add:

```ts
{
  iconName: 'receipt-outline',
  label: internalRoutes.portfolio.subRoutes.expenses.title,
  routerLink: internalRoutes.portfolio.subRoutes.expenses.routerLink
}
```

- [ ] **Step 3: Add lazy route**

Add child route:

```ts
{
  path: internalRoutes.portfolio.subRoutes.expenses.path,
  loadChildren: () =>
    import('./expenses/expenses-page.routes').then((m) => m.routes)
}
```

- [ ] **Step 4: Implement page**

The page must:

- fetch categories and expenses on init
- show a Material table with date, merchant, category, amount, currency, account, comment, actions
- support pagination and date/category filters
- open create/edit/delete flows through dialogs

- [ ] **Step 5: Run client lint/build**

Run:

```bash
nx run client:lint
nx run client:build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/common/src/lib/routes/routes.ts apps/client/src/app/pages/portfolio
git commit -m "feat: add expenses portfolio tab"
```

## Task 8: Expense Dialogs

**Files:**

- Create: `apps/client/src/app/pages/portfolio/expenses/create-or-update-expense-dialog/create-or-update-expense-dialog.component.ts`
- Create: `apps/client/src/app/pages/portfolio/expenses/create-or-update-expense-dialog/create-or-update-expense-dialog.html`
- Create: `apps/client/src/app/pages/portfolio/expenses/create-or-update-expense-dialog/create-or-update-expense-dialog.scss`
- Create: `apps/client/src/app/pages/portfolio/expenses/create-or-update-expense-category-dialog/create-or-update-expense-category-dialog.component.ts`
- Create: `apps/client/src/app/pages/portfolio/expenses/create-or-update-expense-category-dialog/create-or-update-expense-category-dialog.html`
- Create: `apps/client/src/app/pages/portfolio/expenses/create-or-update-expense-category-dialog/create-or-update-expense-category-dialog.scss`

- [ ] **Step 1: Implement expense dialog fields**

Use Reactive Forms with fields:

```ts
(accountId, amount, categoryId, comment, currency, date, merchant, tagIds);
```

Required fields:

```ts
(amount, currency, date);
```

- [ ] **Step 2: Implement category dialog fields**

Use Reactive Forms with fields:

```ts
(name, color);
```

Required field:

```ts
name;
```

- [ ] **Step 3: Wire dialogs to page**

After each create/update/delete operation, refresh category and expense data and call `markForCheck()`.

- [ ] **Step 4: Run client checks**

Run:

```bash
nx run client:lint
nx run client:build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/pages/portfolio/expenses
git commit -m "feat: add expense management dialogs"
```

## Task 9: Final Verification

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
  http://localhost:3333/api/v1/expense-categories
```

Expected: `200 OK` and an array response.

- [ ] **Step 5: Manual UI verification**

Start the app:

```bash
npm run start:server
npm run start:client
```

Open `https://localhost:4200/en/portfolio/expenses`. Confirm the Expenses tab appears, categories can be created, expenses can be created, and the table refreshes.

## Self-Review

- Spec coverage: first-class expense records, UI tab, CRUD API, API-key integration, JWT UI access, user isolation, categories, tags, and accounts are covered.
- Placeholder scan: no placeholder markers or unassigned implementation decisions remain.
- Type consistency: DTO names, route names, permission names, and response names match across tasks.
