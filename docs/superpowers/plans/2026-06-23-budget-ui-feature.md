# Budget UI Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native Portfolio Budget tab that lets authenticated users view, create, edit, and delete monthly category budgets backed by the existing `/api/v1/budgets` endpoints.

**Architecture:** Budget UI lives under the existing lazy-loaded Portfolio route so it appears beside Analysis, Activities, Allocations, FIRE, and X-ray. Shared route metadata stays in `libs/common`, HTTP methods stay in `DataService`, and the page owns presentation state plus Material dialog orchestration. The first UI pass consumes category ids exposed by the backend contract and displays spent/progress values returned by the budget API.

**Tech Stack:** Angular 21 standalone components, Angular Router lazy child routes, Angular Material table/dialog/form controls, RxJS, Jest/Nx tests, Ghostfolio `DataService`, Ghostfolio `GfPageTabsComponent`, Ghostfolio `gf-value`.

---

## File Structure

- Modify: `libs/common/src/lib/routes/routes.ts` adds `portfolio.subRoutes.budget`.
- Create: `libs/common/src/lib/routes/routes.spec.ts` verifies the Budget route metadata.
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.component.ts` adds the Budget tab and registers the wallet icon.
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts` adds the lazy Budget child route.
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.routes.ts` exposes the Budget page as the child route component.
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts` fetches budgets and opens create/edit dialogs.
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.html` renders month selector, summary metrics, table, empty state, and floating action button.
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.scss` keeps spacing/table/progress styling local to the Budget page.
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts` covers data loading and dialog-triggered refresh.
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.ts` provides the create/edit form.
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.html` renders form fields and dialog actions.
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.scss` keeps dialog layout compact.
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.spec.ts` covers create and update payloads.
- Modify: `libs/ui/src/lib/services/data.service.ts` adds Budget HTTP methods.
- Create: `libs/ui/src/lib/services/data.service.spec.ts` verifies the Budget HTTP URLs and payloads.

## Assumptions

- The backend foundation from commit `feat: add budget foundation` exists on `codex/budget-feature`.
- Budget responses use the shared `BudgetResponse` and `BudgetsResponse` interfaces with `amount`, `categoryId`, `id`, `month`, `spent`, and `remaining`.
- Create/update DTOs are exported from `@ghostfolio/common/dtos`.
- The first UI version accepts a category id text value until the Expenses/category management UI lands. This keeps Budget UI independently shippable.

---

### Task 1: Add Budget Route Metadata and Portfolio Tab

**Files:**

- Create: `libs/common/src/lib/routes/routes.spec.ts`
- Modify: `libs/common/src/lib/routes/routes.ts`
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.routes.ts`

- [ ] **Step 1: Write the failing route metadata test**

Create `libs/common/src/lib/routes/routes.spec.ts`:

```ts
import { internalRoutes } from './routes';

describe('internalRoutes', () => {
  it('defines the portfolio budget route', () => {
    expect(internalRoutes.portfolio.subRoutes.budget).toEqual({
      path: 'budget',
      routerLink: ['/portfolio', 'budget'],
      title: 'Budget'
    });
  });
});
```

- [ ] **Step 2: Run the route metadata test and verify it fails**

Run:

```bash
./node_modules/.bin/nx test common --testFile=routes.spec.ts
```

Expected: `FAIL` because `internalRoutes.portfolio.subRoutes.budget` is not defined.

- [ ] **Step 3: Add the Budget route metadata**

In `libs/common/src/lib/routes/routes.ts`, add this entry inside `internalRoutes.portfolio.subRoutes`, after `analysis` and before `fire`:

```ts
      budget: {
        path: 'budget',
        routerLink: ['/portfolio', 'budget'],
        title: $localize`Budget`
      },
```

- [ ] **Step 4: Add the Portfolio tab**

In `apps/client/src/app/pages/portfolio/portfolio-page.component.ts`, add `walletOutline` to the icon imports:

```ts
import {
  analyticsOutline,
  calculatorOutline,
  pieChartOutline,
  scanOutline,
  swapVerticalOutline,
  walletOutline
} from 'ionicons/icons';
```

Add this tab after Activities:

```ts
            {
              iconName: 'wallet-outline',
              label: internalRoutes.portfolio.subRoutes.budget.title,
              routerLink: internalRoutes.portfolio.subRoutes.budget.routerLink
            },
```

Register the icon:

```ts
addIcons({
  analyticsOutline,
  calculatorOutline,
  pieChartOutline,
  scanOutline,
  swapVerticalOutline,
  walletOutline
});
```

- [ ] **Step 5: Add the lazy child route**

In `apps/client/src/app/pages/portfolio/portfolio-page.routes.ts`, add this child route after Activities:

```ts
      {
        path: internalRoutes.portfolio.subRoutes.budget.path,
        loadChildren: () =>
          import('./budget/budget-page.routes').then((m) => m.routes)
      },
```

Create `apps/client/src/app/pages/portfolio/budget/budget-page.routes.ts`:

```ts
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfBudgetPageComponent } from './budget-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfBudgetPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.budget.title
  }
];
```

- [ ] **Step 6: Run the route metadata test and verify it passes**

Run:

```bash
./node_modules/.bin/nx test common --testFile=routes.spec.ts
```

Expected: `PASS`.

- [ ] **Step 7: Commit**

```bash
git add libs/common/src/lib/routes/routes.ts libs/common/src/lib/routes/routes.spec.ts apps/client/src/app/pages/portfolio/portfolio-page.component.ts apps/client/src/app/pages/portfolio/portfolio-page.routes.ts apps/client/src/app/pages/portfolio/budget/budget-page.routes.ts
git commit -m "feat: add budget portfolio route"
```

---

### Task 2: Add Budget HTTP Methods to DataService

**Files:**

- Create: `libs/ui/src/lib/services/data.service.spec.ts`
- Modify: `libs/ui/src/lib/services/data.service.ts`

- [ ] **Step 1: Write the failing DataService test**

Create `libs/ui/src/lib/services/data.service.spec.ts`:

```ts
import { CreateBudgetDto, UpdateBudgetDto } from '@ghostfolio/common/dtos';

import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DataService } from './data.service';

describe('DataService budget methods', () => {
  let dataService: DataService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    dataService = TestBed.inject(DataService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('fetches budgets for a month', () => {
    dataService.fetchBudgets({ month: '2026-06' }).subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/budgets?month=2026-06'
    );

    expect(request.request.method).toBe('GET');
  });

  it('creates a budget', () => {
    const budget: CreateBudgetDto = {
      amount: 500,
      categoryId: 'category-1',
      month: '2026-06'
    };

    dataService.createBudget(budget).subscribe();

    const request = httpTestingController.expectOne('/api/v1/budgets');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(budget);
  });

  it('updates a budget', () => {
    const budget: UpdateBudgetDto = {
      amount: 650,
      categoryId: 'category-1',
      month: '2026-06'
    };

    dataService.updateBudget({ budget, id: 'budget-1' }).subscribe();

    const request = httpTestingController.expectOne('/api/v1/budgets/budget-1');

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(budget);
  });

  it('deletes a budget', () => {
    dataService.deleteBudget('budget-1').subscribe();

    const request = httpTestingController.expectOne('/api/v1/budgets/budget-1');

    expect(request.request.method).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Run the DataService test and verify it fails**

Run:

```bash
./node_modules/.bin/nx test ui --testFile=data.service.spec.ts
```

Expected: `FAIL` because `fetchBudgets`, `createBudget`, `updateBudget`, and `deleteBudget` do not exist.

- [ ] **Step 3: Add imports to DataService**

In `libs/ui/src/lib/services/data.service.ts`, extend the DTO import:

```ts
  CreateBudgetDto,
  CreateAccessDto,
```

and:

```ts
  UpdateBudgetDto,
  UpdateAccessDto,
```

Extend the interface import:

```ts
  BenchmarkResponse,
  BudgetResponse,
  BudgetsResponse,
```

- [ ] **Step 4: Add Budget HTTP methods to DataService**

Add these methods near the other create/fetch/update/delete methods in `libs/ui/src/lib/services/data.service.ts`:

```ts
  public createBudget(budget: CreateBudgetDto) {
    return this.http.post<BudgetResponse>('/api/v1/budgets', budget);
  }

  public deleteBudget(id: string) {
    return this.http.delete<void>(`/api/v1/budgets/${id}`);
  }

  public fetchBudgets({ month }: { month?: string } = {}) {
    let params = new HttpParams();

    if (month) {
      params = params.append('month', month);
    }

    return this.http.get<BudgetsResponse>('/api/v1/budgets', { params });
  }

  public updateBudget({
    budget,
    id
  }: {
    budget: UpdateBudgetDto;
    id: string;
  }) {
    return this.http.put<BudgetResponse>(`/api/v1/budgets/${id}`, budget);
  }
```

- [ ] **Step 5: Run the DataService test and verify it passes**

Run:

```bash
./node_modules/.bin/nx test ui --testFile=data.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add libs/ui/src/lib/services/data.service.ts libs/ui/src/lib/services/data.service.spec.ts
git commit -m "feat: add budget data client"
```

---

### Task 3: Create Budget Page Data Loading

**Files:**

- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.html`
- Create: `apps/client/src/app/pages/portfolio/budget/budget-page.scss`

- [ ] **Step 1: Write the failing page test**

Create `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`:

```ts
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DataService } from '@ghostfolio/ui/services';

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { GfBudgetPageComponent } from './budget-page.component';

describe('GfBudgetPageComponent', () => {
  let fixture: ComponentFixture<GfBudgetPageComponent>;
  let dataService: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    dataService = jasmine.createSpyObj<DataService>('DataService', [
      'fetchBudgets'
    ]);
    dataService.fetchBudgets.and.returnValue(
      of({
        budgets: [
          {
            amount: 500,
            categoryId: 'food',
            id: 'budget-1',
            month: '2026-06',
            remaining: 125,
            spent: 375
          }
        ]
      })
    );

    await TestBed.configureTestingModule({
      imports: [GfBudgetPageComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        {
          provide: DataService,
          useValue: dataService
        },
        {
          provide: UserService,
          useValue: {
            stateChanged: of({
              user: {
                permissions: [],
                settings: {
                  baseCurrency: 'USD',
                  locale: 'en-US'
                }
              }
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfBudgetPageComponent);
  });

  it('loads and renders budgets for the selected month', async () => {
    await fixture.whenStable();

    expect(dataService.fetchBudgets).toHaveBeenCalledWith({
      month: jasmine.stringMatching(/^\\d{4}-\\d{2}$/)
    });
    expect(fixture.nativeElement.textContent).toContain('food');
    expect(fixture.nativeElement.textContent).toContain('Budget');
  });
});
```

- [ ] **Step 2: Run the page test and verify it fails**

Run:

```bash
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts
```

Expected: `FAIL` because `GfBudgetPageComponent` does not exist.

- [ ] **Step 3: Create the Budget page component**

Create `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`:

```ts
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { BudgetResponse, User } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { format } from 'date-fns';

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    GfValueComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    ReactiveFormsModule
  ],
  selector: 'gf-budget-page',
  styleUrls: ['./budget-page.scss'],
  templateUrl: './budget-page.html'
})
export class GfBudgetPageComponent implements OnInit {
  public dataSource = new MatTableDataSource<BudgetResponse>([]);
  public displayedColumns = [
    'category',
    'amount',
    'spent',
    'remaining',
    'progress'
  ];
  public isLoading = true;
  public monthControl = new FormControl(format(new Date(), 'yyyy-MM'), {
    nonNullable: true
  });
  public totalBudgeted = 0;
  public totalRemaining = 0;
  public totalSpent = 0;
  public user: User;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.changeDetectorRef.markForCheck();
        }
      });

    this.monthControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchBudgets();
      });

    this.fetchBudgets();
  }

  public fetchBudgets() {
    this.isLoading = true;

    this.dataService
      .fetchBudgets({ month: this.monthControl.value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ budgets }) => {
        this.dataSource = new MatTableDataSource(budgets);
        this.totalBudgeted = budgets.reduce((sum, budget) => {
          return sum + budget.amount;
        }, 0);
        this.totalSpent = budgets.reduce((sum, budget) => {
          return sum + budget.spent;
        }, 0);
        this.totalRemaining = budgets.reduce((sum, budget) => {
          return sum + budget.remaining;
        }, 0);
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  public getProgress({ amount, spent }: BudgetResponse) {
    if (amount <= 0) {
      return 0;
    }

    return Math.min((spent / amount) * 100, 100);
  }
}
```

- [ ] **Step 4: Create the Budget page template**

Create `apps/client/src/app/pages/portfolio/budget/budget-page.html`:

```html
<div class="container">
  <div class="row">
    <div class="col">
      <h1 class="d-none d-sm-block h3 mb-3 text-center" i18n>Budget</h1>

      <div class="align-items-center d-flex flex-wrap mb-3">
        <label class="mb-2 mr-2" for="budget-month" i18n>Month</label>
        <input
          class="form-control budget-month-input mb-2"
          id="budget-month"
          type="month"
          [formControl]="monthControl"
        />
      </div>

      <div class="budget-summary mb-3">
        <div>
          <div class="text-muted" i18n>Budgeted</div>
          <gf-value
            [isCurrency]="true"
            [locale]="user?.settings?.locale"
            [unit]="user?.settings?.baseCurrency"
            [value]="totalBudgeted"
          />
        </div>
        <div>
          <div class="text-muted" i18n>Spent</div>
          <gf-value
            [isCurrency]="true"
            [locale]="user?.settings?.locale"
            [unit]="user?.settings?.baseCurrency"
            [value]="totalSpent"
          />
        </div>
        <div>
          <div class="text-muted" i18n>Remaining</div>
          <gf-value
            [isCurrency]="true"
            [locale]="user?.settings?.locale"
            [unit]="user?.settings?.baseCurrency"
            [value]="totalRemaining"
          />
        </div>
      </div>

      @if (dataSource.data.length > 0) {
      <table class="gf-table w-100" mat-table [dataSource]="dataSource">
        <ng-container matColumnDef="category">
          <th *matHeaderCellDef i18n mat-header-cell>Category</th>
          <td *matCellDef="let budget" mat-cell>{{ budget.categoryId }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th *matHeaderCellDef class="text-right" i18n mat-header-cell>
            Budget
          </th>
          <td *matCellDef="let budget" class="text-right" mat-cell>
            <gf-value
              [isCurrency]="true"
              [locale]="user?.settings?.locale"
              [unit]="user?.settings?.baseCurrency"
              [value]="budget.amount"
            />
          </td>
        </ng-container>

        <ng-container matColumnDef="spent">
          <th *matHeaderCellDef class="text-right" i18n mat-header-cell>
            Spent
          </th>
          <td *matCellDef="let budget" class="text-right" mat-cell>
            <gf-value
              [isCurrency]="true"
              [locale]="user?.settings?.locale"
              [unit]="user?.settings?.baseCurrency"
              [value]="budget.spent"
            />
          </td>
        </ng-container>

        <ng-container matColumnDef="remaining">
          <th *matHeaderCellDef class="text-right" i18n mat-header-cell>
            Remaining
          </th>
          <td *matCellDef="let budget" class="text-right" mat-cell>
            <gf-value
              [isCurrency]="true"
              [locale]="user?.settings?.locale"
              [unit]="user?.settings?.baseCurrency"
              [value]="budget.remaining"
            />
          </td>
        </ng-container>

        <ng-container matColumnDef="progress">
          <th *matHeaderCellDef i18n mat-header-cell>Progress</th>
          <td *matCellDef="let budget" mat-cell>
            <mat-progress-bar
              mode="determinate"
              [value]="getProgress(budget)"
            />
          </td>
        </ng-container>

        <tr *matHeaderRowDef="displayedColumns" mat-header-row></tr>
        <tr *matRowDef="let row; columns: displayedColumns" mat-row></tr>
      </table>
      } @else if (!isLoading) {
      <div class="py-5 text-center text-muted" i18n>
        No budgets have been created for this month.
      </div>
      }
    </div>
  </div>
</div>
```

- [ ] **Step 5: Create the Budget page styles**

Create `apps/client/src/app/pages/portfolio/budget/budget-page.scss`:

```scss
:host {
  display: block;
}

.budget-month-input {
  max-width: 11rem;
}

.budget-summary {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}
```

- [ ] **Step 6: Run the page test and verify it passes**

Run:

```bash
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts
```

Expected: `PASS`.

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/app/pages/portfolio/budget/budget-page.component.ts apps/client/src/app/pages/portfolio/budget/budget-page.html apps/client/src/app/pages/portfolio/budget/budget-page.scss apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts
git commit -m "feat: add budget page"
```

---

### Task 4: Add Create and Edit Budget Dialog

**Files:**

- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.spec.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.ts`
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.html`
- Create: `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.scss`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.html`

- [ ] **Step 1: Write the failing dialog test**

Create `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.spec.ts`:

```ts
import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { GfCreateOrUpdateBudgetDialogComponent } from './create-or-update-budget-dialog.component';

describe('GfCreateOrUpdateBudgetDialogComponent', () => {
  let component: GfCreateOrUpdateBudgetDialogComponent;
  let fixture: ComponentFixture<GfCreateOrUpdateBudgetDialogComponent>;
  let dataService: jasmine.SpyObj<DataService>;
  let dialogRef: jasmine.SpyObj<
    MatDialogRef<GfCreateOrUpdateBudgetDialogComponent>
  >;

  beforeEach(async () => {
    dataService = jasmine.createSpyObj<DataService>('DataService', [
      'createBudget',
      'updateBudget'
    ]);
    dataService.createBudget.and.returnValue(
      of({
        amount: 500,
        categoryId: 'food',
        id: 'budget-1',
        month: '2026-06',
        remaining: 500,
        spent: 0
      })
    );
    dataService.updateBudget.and.returnValue(
      of({
        amount: 650,
        categoryId: 'food',
        id: 'budget-1',
        month: '2026-06',
        remaining: 650,
        spent: 0
      })
    );
    dialogRef = jasmine.createSpyObj<
      MatDialogRef<GfCreateOrUpdateBudgetDialogComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [GfCreateOrUpdateBudgetDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: DataService,
          useValue: dataService
        },
        {
          provide: MatDialogRef,
          useValue: dialogRef
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            budget: undefined,
            month: '2026-06'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfCreateOrUpdateBudgetDialogComponent);
    component = fixture.componentInstance;
  });

  it('creates a budget and closes with refresh', async () => {
    component.budgetForm.setValue({
      amount: 500,
      categoryId: 'food',
      month: '2026-06'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(dataService.createBudget).toHaveBeenCalledWith({
      amount: 500,
      categoryId: 'food',
      month: '2026-06'
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });
});
```

- [ ] **Step 2: Run the dialog test and verify it fails**

Run:

```bash
./node_modules/.bin/nx test client --testFile=create-or-update-budget-dialog.component.spec.ts
```

Expected: `FAIL` because `GfCreateOrUpdateBudgetDialogComponent` does not exist.

- [ ] **Step 3: Create the dialog component**

Create `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.ts`:

```ts
import { CreateBudgetDto, UpdateBudgetDto } from '@ghostfolio/common/dtos';
import { BudgetResponse } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CreateOrUpdateBudgetDialogData {
  budget?: BudgetResponse;
  month: string;
}

@Component({
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-budget-dialog',
  styleUrls: ['./create-or-update-budget-dialog.scss'],
  templateUrl: './create-or-update-budget-dialog.html'
})
export class GfCreateOrUpdateBudgetDialogComponent {
  public budgetForm = new FormGroup({
    amount: new FormControl<number>(this.data.budget?.amount ?? 0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)]
    }),
    categoryId: new FormControl<string>(this.data.budget?.categoryId ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    month: new FormControl<string>(this.data.budget?.month ?? this.data.month, {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateBudgetDialogData,
    private dataService: DataService,
    private dialogRef: MatDialogRef<GfCreateOrUpdateBudgetDialogComponent>
  ) {}

  public onSubmit() {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const budget = this.budgetForm.getRawValue();

    if (this.data.budget) {
      this.updateBudget(budget);
    } else {
      this.createBudget(budget);
    }
  }

  private createBudget(budget: CreateBudgetDto) {
    this.dataService.createBudget(budget).subscribe(() => {
      this.dialogRef.close({ refresh: true });
    });
  }

  private updateBudget(budget: UpdateBudgetDto) {
    this.dataService
      .updateBudget({
        budget,
        id: this.data.budget.id
      })
      .subscribe(() => {
        this.dialogRef.close({ refresh: true });
      });
  }
}
```

- [ ] **Step 4: Create the dialog template**

Create `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.html`:

```html
<h2 mat-dialog-title>
  @if (data.budget) {
  <ng-container i18n>Edit budget</ng-container>
  } @else {
  <ng-container i18n>Create budget</ng-container>
  }
</h2>

<form [formGroup]="budgetForm" (ngSubmit)="onSubmit()">
  <mat-dialog-content class="budget-dialog-content">
    <mat-form-field appearance="outline">
      <mat-label i18n>Month</mat-label>
      <input formControlName="month" matInput type="month" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label i18n>Category id</mat-label>
      <input formControlName="categoryId" matInput />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label i18n>Amount</mat-label>
      <input
        formControlName="amount"
        matInput
        min="0.01"
        step="0.01"
        type="number"
      />
    </mat-form-field>
  </mat-dialog-content>

  <mat-dialog-actions align="end">
    <button i18n mat-button mat-dialog-close type="button">Cancel</button>
    <button
      color="primary"
      i18n
      mat-flat-button
      type="submit"
      [disabled]="budgetForm.invalid"
    >
      Save
    </button>
  </mat-dialog-actions>
</form>
```

- [ ] **Step 5: Create the dialog styles**

Create `apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.scss`:

```scss
.budget-dialog-content {
  display: grid;
  gap: 0.5rem;
  min-width: min(26rem, 80vw);
}
```

- [ ] **Step 6: Wire page actions to the dialog**

In `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`, add these imports:

```ts
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { GfCreateOrUpdateBudgetDialogComponent } from './create-or-update-budget-dialog/create-or-update-budget-dialog.component';
```

Add `MatDialogModule` to the component `imports`.

Add `actions` to `displayedColumns`:

```ts
  public displayedColumns = [
    'category',
    'amount',
    'spent',
    'remaining',
    'progress',
    'actions'
  ];
```

Inject the dialog:

```ts
    private dialog: MatDialog,
```

Add these methods:

```ts
  public onCreateBudget() {
    this.openBudgetDialog({
      month: this.monthControl.value
    });
  }

  public onUpdateBudget(budget: BudgetResponse) {
    this.openBudgetDialog({
      budget,
      month: this.monthControl.value
    });
  }

  private openBudgetDialog(data: {
    budget?: BudgetResponse;
    month: string;
  }) {
    this.dialog
      .open(GfCreateOrUpdateBudgetDialogComponent, {
        data,
        width: '32rem'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.refresh) {
          this.fetchBudgets();
        }
      });
  }
```

In `apps/client/src/app/pages/portfolio/budget/budget-page.html`, add this table column before the row definitions:

```html
<ng-container matColumnDef="actions">
  <th *matHeaderCellDef class="text-right" mat-header-cell></th>
  <td *matCellDef="let budget" class="text-right" mat-cell>
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="'Edit budget'"
      (click)="onUpdateBudget(budget)"
    >
      <mat-icon>edit</mat-icon>
    </button>
  </td>
</ng-container>
```

Add this button after the table/empty state block:

```html
<button
  class="mt-3"
  color="primary"
  i18n
  mat-flat-button
  type="button"
  (click)="onCreateBudget()"
>
  Create budget
</button>
```

- [ ] **Step 7: Run the dialog and page tests**

Run:

```bash
./node_modules/.bin/nx test client --testFile=create-or-update-budget-dialog.component.spec.ts
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts
```

Expected: both commands report `PASS`.

- [ ] **Step 8: Commit**

```bash
git add apps/client/src/app/pages/portfolio/budget
git commit -m "feat: add budget editor dialog"
```

---

### Task 5: Add Delete Budget Action

**Files:**

- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.html`

- [ ] **Step 1: Extend the failing page test**

In `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`, add `deleteBudget` to the DataService spy and return value:

```ts
dataService = jasmine.createSpyObj<DataService>('DataService', [
  'deleteBudget',
  'fetchBudgets'
]);
dataService.deleteBudget.and.returnValue(of(undefined));
```

Add this test:

```ts
it('deletes a budget and reloads the month', async () => {
  const component = fixture.componentInstance;

  await fixture.whenStable();

  component.onDeleteBudget('budget-1');
  await fixture.whenStable();

  expect(dataService.deleteBudget).toHaveBeenCalledWith('budget-1');
  expect(dataService.fetchBudgets).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run the page test and verify it fails**

Run:

```bash
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts
```

Expected: `FAIL` because `onDeleteBudget` does not exist.

- [ ] **Step 3: Implement delete in the Budget page**

In `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`, add:

```ts
  public onDeleteBudget(id: string) {
    this.dataService
      .deleteBudget(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchBudgets();
      });
  }
```

In the `actions` column in `apps/client/src/app/pages/portfolio/budget/budget-page.html`, add this button after the edit button:

```html
<button
  mat-icon-button
  type="button"
  [attr.aria-label]="'Delete budget'"
  (click)="onDeleteBudget(budget.id)"
>
  <mat-icon>delete</mat-icon>
</button>
```

- [ ] **Step 4: Run the page test and verify it passes**

Run:

```bash
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/app/pages/portfolio/budget/budget-page.component.ts apps/client/src/app/pages/portfolio/budget/budget-page.html apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts
git commit -m "feat: add budget delete action"
```

---

### Task 6: Build and Browser Verification

**Files:**

- Modify only files reported by the verification commands.

- [ ] **Step 1: Format changed files**

Run:

```bash
./node_modules/.bin/nx format:write --files=libs/common/src/lib/routes/routes.ts,libs/common/src/lib/routes/routes.spec.ts,libs/ui/src/lib/services/data.service.ts,libs/ui/src/lib/services/data.service.spec.ts,apps/client/src/app/pages/portfolio/portfolio-page.component.ts,apps/client/src/app/pages/portfolio/portfolio-page.routes.ts,apps/client/src/app/pages/portfolio/budget/budget-page.routes.ts,apps/client/src/app/pages/portfolio/budget/budget-page.component.ts,apps/client/src/app/pages/portfolio/budget/budget-page.html,apps/client/src/app/pages/portfolio/budget/budget-page.scss,apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts,apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.ts,apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.html,apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.scss,apps/client/src/app/pages/portfolio/budget/create-or-update-budget-dialog/create-or-update-budget-dialog.component.spec.ts
```

Expected: command exits with status `0`.

- [ ] **Step 2: Run focused tests**

Run:

```bash
./node_modules/.bin/nx test common --testFile=routes.spec.ts
./node_modules/.bin/nx test ui --testFile=data.service.spec.ts
./node_modules/.bin/nx test client --testFile=budget-page.component.spec.ts
./node_modules/.bin/nx test client --testFile=create-or-update-budget-dialog.component.spec.ts
```

Expected: all commands report `PASS`.

- [ ] **Step 3: Build the client**

Run:

```bash
./node_modules/.bin/nx run client:build:development-en
```

Expected: Angular build completes without TypeScript, template, or style errors.

- [ ] **Step 4: Start the dev servers**

Terminal 1:

```bash
npm run start:server
```

Terminal 2:

```bash
npm run start:client
```

Expected: API server remains running, and the client prints the local URL for `https://localhost:4200/en`.

- [ ] **Step 5: Verify in the browser**

Open:

```text
https://localhost:4200/en/portfolio/budget
```

Verify:

- The Portfolio tabs include `Budget`.
- The Budget tab is selected on `/portfolio/budget`.
- The month selector is visible and defaults to the current month.
- Empty state appears when there are no budgets.
- `Create budget` opens the dialog.
- Saving a valid category id, month, and amount closes the dialog and refreshes the table.
- Edit opens with the selected row values.
- Delete removes the row and refreshes the table.
- No text overlaps at desktop width `1440px` and mobile width `390px`.

- [ ] **Step 6: Final commit**

```bash
git status --short
git add apps/client/src/app/pages/portfolio libs/common/src/lib/routes libs/ui/src/lib/services
git commit -m "feat: add budget portfolio ui"
```

Expected: commit succeeds. If earlier task commits were already created, this command reports no staged files; keep the earlier task commits.

---

## Self-Review

- Spec coverage: Budget tab, route, page, API client calls, create/edit/delete UI, and verification are covered.
- Placeholder scan: This plan avoids placeholder markers and gives concrete file paths, commands, and code snippets for each code-changing step.
- Type consistency: Route key is `budget`, path is `budget`, router link is `['/portfolio', 'budget']`, component class is `GfBudgetPageComponent`, dialog class is `GfCreateOrUpdateBudgetDialogComponent`, and DataService methods are `fetchBudgets`, `createBudget`, `updateBudget`, and `deleteBudget`.
