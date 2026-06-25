import type {
  CreateBudgetDto,
  ManualBudgetType
} from '@ghostfolio/common/dtos/create-budget.dto';
import type { UpdateBudgetDto } from '@ghostfolio/common/dtos/update-budget.dto';
import type { AccountsResponse } from '@ghostfolio/common/interfaces/responses/accounts-response.interface';
import type { BudgetResponse } from '@ghostfolio/common/interfaces/responses/budget-response.interface';
import type { ExpenseCategoryResponse } from '@ghostfolio/common/interfaces/responses/expense-category-response.interface';
import type { AccountWithValue } from '@ghostfolio/common/types';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface CreateOrUpdateBudgetDialogData {
  budget?: BudgetResponse;
  currency: string;
  month: string;
}

@Component({
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-budget-dialog',
  styleUrls: ['./create-or-update-budget-dialog.scss'],
  templateUrl: './create-or-update-budget-dialog.html'
})
export class GfCreateOrUpdateBudgetDialogComponent implements OnInit {
  public budgetForm = new FormGroup({
    accountId: new FormControl<string>(this.data.budget?.accountId ?? '', {
      nonNullable: true
    }),
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
    }),
    name: new FormControl<string>(this.data.budget?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    type: new FormControl<ManualBudgetType>(
      (this.data.budget?.type as ManualBudgetType) ?? 'EXPENSE',
      {
        nonNullable: true,
        validators: [Validators.required]
      }
    )
  });
  public accounts: AccountWithValue[] = [];
  public budgetTypes: Array<{ label: string; value: ManualBudgetType }> = [
    { label: $localize`Expense`, value: 'EXPENSE' },
    { label: $localize`Cash savings`, value: 'CASH_SAVINGS' },
    { label: $localize`Investment savings`, value: 'INVESTMENT_SAVINGS' }
  ];
  public categories: ExpenseCategoryResponse[] = [];
  public isLoadingAccounts = true;
  public isLoadingCategories = true;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateBudgetDialogData,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private dialogRef: MatDialogRef<GfCreateOrUpdateBudgetDialogComponent>
  ) {}

  public ngOnInit() {
    this.dataService
      .fetchAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accounts }: AccountsResponse) => {
        this.accounts = accounts;
        this.isLoadingAccounts = false;
      });

    this.dataService
      .fetchExpenseCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categories) => {
        this.categories = categories;
        this.isLoadingCategories = false;
      });
  }

  public onSubmit() {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const { accountId, ...formValue } = this.budgetForm.getRawValue();
    const budget = {
      ...formValue,
      ...(accountId ? { accountId } : {}),
      currency: this.data.currency
    };

    if (this.data.budget) {
      this.updateBudget({
        ...budget,
        id: this.data.budget.id
      });
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
