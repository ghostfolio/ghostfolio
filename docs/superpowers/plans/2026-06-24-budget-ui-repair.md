# Budget UI Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken Budget page category management UI so the dialog is readable, actions render as compact icons, and the layout works in dark mode at desktop and narrow widths.

**Architecture:** Keep the existing Angular Material dialog/table pattern, but stop relying on Material icon font ligatures for action buttons in the Budget feature. Use Ghostfolio's existing Ionic icon pattern for edit/delete actions, constrain action columns, and make the category form/table responsive with stable widths.

**Tech Stack:** Angular 21 standalone components, Angular Material dialog/table/form controls, Ionic standalone icons, Jest, Nx.

---

## Current Breakage From Screenshots

- In `Manage categories`, action icons render as visible text (`edit delete`) and overflow the table row.
- The dialog content is too narrow for the form plus action column, so controls feel cramped and clipped.
- The category table action column has no stable width, so icon/text fallback can steal space from data columns.
- The Budget page uses the same `mat-icon` pattern for budget row edit/delete actions, so it should be fixed in the same pass.

## File Structure

- Modify `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.ts`: replace `MatIconModule` dependency with `IonIcon`, register `createOutline` and `trashOutline`.
- Modify `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.html`: replace `<mat-icon>` action content with `<ion-icon>`, add action button classes, and improve table/action markup.
- Modify `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.scss`: add responsive dialog form layout, stable action column/button sizing, color swatch truncation, and mobile table behavior.
- Modify `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts`: assert icon buttons exist by aria labels, form actions remain usable, and category color renders without exposing raw icon ligature text.
- Modify `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`: replace `MatIconModule` dependency with `IonIcon`, register `createOutline` and `trashOutline`, widen category dialog.
- Modify `apps/client/src/app/pages/portfolio/budget/budget-page.html`: replace budget row `<mat-icon>` actions with Ionic icons and stable action button classes.
- Modify `apps/client/src/app/pages/portfolio/budget/budget-page.scss`: add stable table action sizing and horizontal overflow handling for dense budget rows.
- Modify `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`: assert budget row actions render without raw icon words and dialog opens with the wider dimensions.

---

## Task 1: Replace Broken Material Icon Ligatures In Category Dialog

**Files:**

- Modify: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.html`
- Modify: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts`

- [ ] **Step 1: Write the failing icon rendering test**

Add this assertion to `it('loads expense categories', ...)` after `await fixture.whenStable();`:

```ts
expect(
  fixture.nativeElement.querySelector('[aria-label="Edit category"] ion-icon')
).not.toBeNull();
expect(
  fixture.nativeElement.querySelector('[aria-label="Delete category"] ion-icon')
).not.toBeNull();
expect(fixture.nativeElement.textContent).not.toContain('editdelete');
```

- [ ] **Step 2: Run the category dialog spec and confirm it fails**

Run:

```bash
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts --runInBand --watchman=false
```

Expected: FAIL because the template still uses `<mat-icon>` instead of `<ion-icon>`.

- [ ] **Step 3: Replace Material icons with Ionic icons in the component**

In `manage-budget-categories-dialog.component.ts`, replace the `MatIconModule` import and component dependency with Ionic icons:

```ts
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
```

Remove:

```ts
import { MatIconModule } from '@angular/material/icon';
```

Update `imports`:

```ts
imports: [
  CommonModule,
  IonIcon,
  MatButtonModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatTableModule,
  ReactiveFormsModule
],
```

Add this constructor body after dependency injection parameters:

```ts
  ) {
    addIcons({ createOutline, trashOutline });
  }
```

- [ ] **Step 4: Replace the category action button markup**

In `manage-budget-categories-dialog.html`, replace the two `<mat-icon>` button bodies with:

```html
<button
  class="category-action-button"
  mat-icon-button
  type="button"
  [attr.aria-label]="'Edit category'"
  (click)="onEditCategory(category)"
>
  <ion-icon aria-hidden="true" name="create-outline" />
</button>
<button
  class="category-action-button"
  mat-icon-button
  type="button"
  [attr.aria-label]="'Delete category'"
  (click)="onDeleteCategory(category.id)"
>
  <ion-icon aria-hidden="true" name="trash-outline" />
</button>
```

- [ ] **Step 5: Run the category dialog spec and confirm it passes**

Run:

```bash
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts --runInBand --watchman=false
```

Expected: PASS.

---

## Task 2: Repair Category Dialog Layout And Responsiveness

**Files:**

- Modify: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.html`
- Modify: `apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.scss`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`

- [ ] **Step 1: Widen the dialog safely**

In `budget-page.component.ts`, update `onManageCategories()`:

```ts
this.dialog
  .open(GfManageBudgetCategoriesDialogComponent, {
    maxWidth: 'calc(100vw - 2rem)',
    width: '42rem'
  })
```

- [ ] **Step 2: Add stable table classes in the category template**

In `manage-budget-categories-dialog.html`, update the table element:

```html
<table
  class="category-table gf-table w-100"
  mat-table
  [dataSource]="dataSource"
>
```

Update the actions column cells:

```html
<th
  *matHeaderCellDef
  class="category-actions-column text-right"
  mat-header-cell
></th>
<td
  *matCellDef="let category"
  class="category-actions-column text-right"
  mat-cell
>
```

- [ ] **Step 3: Add defensive layout CSS**

Replace `manage-budget-categories-dialog.scss` with:

```scss
:host {
  display: block;
}

.category-form {
  align-items: start;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(12rem, 1fr) minmax(8rem, 10rem) auto;
}

.category-form-actions {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  min-height: 3.5rem;
}

.category-table {
  table-layout: fixed;
}

.category-table .mat-column-name {
  width: 45%;
}

.category-table .mat-column-color {
  width: 35%;
}

.category-actions-column {
  white-space: nowrap;
  width: 6rem;
}

.category-action-button {
  height: 2.25rem;
  line-height: 2.25rem;
  width: 2.25rem;
}

.category-action-button ion-icon {
  font-size: 1.125rem;
}

.category-color {
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-color-swatch {
  border: 1px solid var(--border-color);
  display: inline-block;
  flex: 0 0 auto;
  height: 1rem;
  width: 1rem;
}

@media (max-width: 767.98px) {
  .category-form {
    grid-template-columns: 1fr;
  }

  .category-form-actions {
    justify-content: flex-start;
    min-height: auto;
  }

  .category-table {
    min-width: 32rem;
  }

  mat-dialog-content {
    overflow-x: auto;
  }
}
```

- [ ] **Step 4: Update the budget page dialog width test**

In `budget-page.component.spec.ts`, update the category dialog expectation to:

```ts
expect(dialog.open).toHaveBeenCalledWith(expect.any(Function), {
  maxWidth: 'calc(100vw - 2rem)',
  width: '42rem'
});
```

- [ ] **Step 5: Run the page and category specs**

Run:

```bash
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts --runInBand --watchman=false
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts --runInBand --watchman=false
```

Expected: both PASS.

---

## Task 3: Fix Budget Table Row Action Icons And Dense Table Overflow

**Files:**

- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.ts`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.html`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.scss`
- Modify: `apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts`

- [ ] **Step 1: Add failing budget action icon assertions**

In `budget-page.component.spec.ts`, inside `it('loads and renders budgets for the selected month', ...)`, add:

```ts
expect(
  fixture.nativeElement.querySelector('[aria-label="Edit budget"] ion-icon')
).not.toBeNull();
expect(
  fixture.nativeElement.querySelector('[aria-label="Delete budget"] ion-icon')
).not.toBeNull();
expect(fixture.nativeElement.textContent).not.toContain('editdelete');
```

- [ ] **Step 2: Run the budget page spec and confirm it fails**

Run:

```bash
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts --runInBand --watchman=false
```

Expected: FAIL because budget row actions still use `<mat-icon>`.

- [ ] **Step 3: Replace Material icon dependency in the budget page**

In `budget-page.component.ts`, add:

```ts
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
```

Remove:

```ts
import { MatIconModule } from '@angular/material/icon';
```

Update `imports`:

```ts
imports: [
  CommonModule,
  GfValueComponent,
  IonIcon,
  MatButtonModule,
  MatProgressBarModule,
  MatTableModule,
  ReactiveFormsModule
],
```

Add this constructor body after dependency injection parameters:

```ts
  ) {
    addIcons({ createOutline, trashOutline });
  }
```

- [ ] **Step 4: Replace budget row action markup**

In `budget-page.html`, replace the two budget action button bodies with:

```html
<button
  class="budget-action-button"
  mat-icon-button
  type="button"
  [attr.aria-label]="'Edit budget'"
  (click)="onUpdateBudget(budget)"
>
  <ion-icon aria-hidden="true" name="create-outline" />
</button>
<button
  class="budget-action-button"
  mat-icon-button
  type="button"
  [attr.aria-label]="'Delete budget'"
  (click)="onDeleteBudget(budget.id)"
>
  <ion-icon aria-hidden="true" name="trash-outline" />
</button>
```

- [ ] **Step 5: Add stable budget table action CSS**

Append to `budget-page.scss`:

```scss
.budget-table-wrapper {
  overflow-x: auto;
}

.budget-table {
  min-width: 56rem;
}

.budget-table .mat-column-actions {
  white-space: nowrap;
  width: 6rem;
}

.budget-action-button {
  height: 2.25rem;
  line-height: 2.25rem;
  width: 2.25rem;
}

.budget-action-button ion-icon {
  font-size: 1.125rem;
}
```

Wrap the table in `budget-page.html`:

```html
<div class="budget-table-wrapper">
  <table class="budget-table gf-table w-100" mat-table [dataSource]="dataSource">
    ...
  </table>
</div>
```

- [ ] **Step 6: Run the budget page spec**

Run:

```bash
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts --runInBand --watchman=false
```

Expected: PASS.

---

## Task 4: Visual Verification In Browser

**Files:**

- No source edits expected unless verification finds a regression.

- [ ] **Step 1: Start the dev server**

Run:

```bash
pnpm start:dev
```

If the project uses the existing Nx command instead, run:

```bash
./node_modules/.bin/nx run client:serve:development-en --hmr -o
```

Expected: Budget page is available on the local dev server.

- [ ] **Step 2: Open Budget page and Manage categories**

Use the browser to navigate to the Budget page, then click `Manage categories`.

Expected:

- Dialog width is about `42rem` on desktop.
- Form fields and Create button are aligned on one row at desktop width.
- Table actions are two compact icon buttons, not visible `edit delete` text.
- The close button remains visible and aligned to the right.

- [ ] **Step 3: Verify narrow width**

Resize the viewport below `768px`.

Expected:

- Category form stacks vertically.
- Table can scroll horizontally if needed.
- No controls overlap or clip text.

---

## Task 5: Final Verification And Commit

**Files:**

- All modified Budget UI files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/manage-budget-categories-dialog/manage-budget-categories-dialog.component.spec.ts --runInBand --watchman=false
./node_modules/.bin/jest --config apps/client/jest.config.ts apps/client/src/app/pages/portfolio/budget/budget-page.component.spec.ts --runInBand --watchman=false
```

Expected: both PASS.

- [ ] **Step 2: Run Angular compiler**

Run:

```bash
./node_modules/.bin/ngc -p apps/client/tsconfig.app.json
```

Expected: exits with code 0.

- [ ] **Step 3: Run client build if the local environment allows it**

Run:

```bash
./node_modules/.bin/nx run client:build:development-en
```

Expected: PASS. If it still exits without diagnostics in this sandbox, record that `ngc` and focused specs passed, then rerun in the normal user terminal before merging.

- [ ] **Step 4: Commit**

Run:

```bash
git add apps/client/src/app/pages/portfolio/budget
git commit -m "fix: repair budget category dialog layout"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: The plan directly addresses the visible broken category dialog, icon text overflow, table action clipping, and responsive layout.
- Placeholder scan: No `TODO`, `TBD`, or unspecified implementation steps remain.
- Type consistency: Uses `IonIcon`, `addIcons`, `createOutline`, and `trashOutline` consistently in both Budget page and category dialog.
