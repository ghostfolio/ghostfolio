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
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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

    const budget = {
      ...this.budgetForm.getRawValue(),
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
