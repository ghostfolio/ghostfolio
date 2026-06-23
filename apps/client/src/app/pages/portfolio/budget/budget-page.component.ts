import { UserService } from '@ghostfolio/client/services/user/user.service';
import { BudgetResponse, User } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { format } from 'date-fns';

import { GfCreateOrUpdateBudgetDialogComponent } from './create-or-update-budget-dialog/create-or-update-budget-dialog.component';
import { GfManageBudgetCategoriesDialogComponent } from './manage-budget-categories-dialog/manage-budget-categories-dialog.component';

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
    'progress',
    'actions'
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
    private dialog: MatDialog,
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
      .subscribe(({ budgets, totalBudgeted, totalRemaining, totalSpent }) => {
        this.dataSource = new MatTableDataSource(budgets);
        this.totalBudgeted = totalBudgeted;
        this.totalRemaining = totalRemaining;
        this.totalSpent = totalSpent;
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

  public onCreateBudget() {
    this.openBudgetDialog({
      currency: this.getCurrency(),
      month: this.monthControl.value
    });
  }

  public onDeleteBudget(id: string) {
    this.dataService
      .deleteBudget(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchBudgets();
      });
  }

  public onManageCategories() {
    this.dialog
      .open(GfManageBudgetCategoriesDialogComponent, {
        width: '36rem'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  public onUpdateBudget(budget: BudgetResponse) {
    this.openBudgetDialog({
      budget,
      currency: this.getCurrency(budget.currency),
      month: this.monthControl.value
    });
  }

  private getCurrency(fallback = 'USD') {
    return this.user?.settings?.baseCurrency ?? fallback;
  }

  private openBudgetDialog(data: {
    budget?: BudgetResponse;
    currency: string;
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
}
