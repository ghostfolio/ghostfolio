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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { format } from 'date-fns';

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    GfValueComponent,
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
}
