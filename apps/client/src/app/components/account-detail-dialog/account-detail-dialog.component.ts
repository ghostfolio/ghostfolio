import { CreateAccountBalanceDto } from '@ghostfolio/api/app/account-balance/create-account-balance.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  HistoricalDataItem,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { routes } from '@ghostfolio/common/routes';
import { OrderWithAccount } from '@ghostfolio/common/types';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Big } from 'big.js';
import { format, parseISO } from 'date-fns';
import { isNumber } from 'lodash';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-account-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'account-detail-dialog.html',
  styleUrls: ['./account-detail-dialog.component.scss'],
  standalone: false
})
export class AccountDetailDialog implements OnDestroy, OnInit {
  public accountBalances: AccountBalancesResponse['balances'];
  public activities: OrderWithAccount[];
  public balance: number;
  public currency: string;
  public dataSource: MatTableDataSource<Activity>;
  public equity: number;
  public hasPermissionToDeleteAccountBalance: boolean;
  public historicalDataItems: HistoricalDataItem[];
  public holdings: PortfolioPosition[];
  public isLoadingActivities: boolean;
  public isLoadingChart: boolean;
  public name: string;
  public platformName: string;
  public sortColumn = 'date';
  public sortDirection: SortDirection = 'desc';
  public totalItems: number;
  public transactionCount: number;
  public user: User;
  public valueInBaseCurrency: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AccountDetailDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<AccountDetailDialog>,
    private router: Router,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToDeleteAccountBalance = hasPermission(
            this.user.permissions,
            permissions.deleteAccountBalance
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.initialize();
  }

  public onCloneActivity(aActivity: Activity) {
    this.router.navigate(['/' + routes.portfolio, routes.activities], {
      queryParams: { activityId: aActivity.id, createDialog: true }
    });

    this.dialogRef.close();
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onAddAccountBalance(accountBalance: CreateAccountBalanceDto) {
    this.dataService
      .postAccountBalance(accountBalance)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initialize();
      });
  }

  public onDeleteAccountBalance(aId: string) {
    this.dataService
      .deleteAccountBalance(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initialize();
      });
  }

  public onExport() {
    const activityIds = this.dataSource.data.map(({ id }) => {
      return id;
    });

    this.dataService
      .fetchExport({ activityIds })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${this.name
            .replace(/\s+/g, '-')
            .toLowerCase()}-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  public onSortChanged({ active, direction }: Sort) {
    this.sortColumn = active;
    this.sortDirection = direction;

    this.fetchActivities();
  }

  public onUpdateActivity(aActivity: Activity) {
    this.router.navigate(['/' + routes.portfolio, routes.activities], {
      queryParams: { activityId: aActivity.id, editDialog: true }
    });

    this.dialogRef.close();
  }

  private fetchAccount() {
    this.dataService
      .fetchAccount(this.data.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          balance,
          currency,
          name,
          Platform,
          transactionCount,
          value,
          valueInBaseCurrency
        }) => {
          this.balance = balance;
          this.currency = currency;

          if (isNumber(balance) && isNumber(value)) {
            this.equity = new Big(value).minus(balance).toNumber();
          } else {
            this.equity = null;
          }

          this.name = name;
          this.platformName = Platform?.name ?? '-';
          this.transactionCount = transactionCount;
          this.valueInBaseCurrency = valueInBaseCurrency;

          this.changeDetectorRef.markForCheck();
        }
      );
  }

  private fetchActivities() {
    this.isLoadingActivities = true;

    this.dataService
      .fetchActivities({
        filters: [{ id: this.data.accountId, type: 'ACCOUNT' }],
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities, count }) => {
        this.dataSource = new MatTableDataSource(activities);
        this.totalItems = count;

        this.isLoadingActivities = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchChart() {
    this.isLoadingChart = true;

    forkJoin({
      accountBalances: this.dataService
        .fetchAccountBalances(this.data.accountId)
        .pipe(takeUntil(this.unsubscribeSubject)),
      portfolioPerformance: this.dataService
        .fetchPortfolioPerformance({
          filters: [
            {
              id: this.data.accountId,
              type: 'ACCOUNT'
            }
          ],
          range: 'max',
          withExcludedAccounts: true,
          withItems: true
        })
        .pipe(takeUntil(this.unsubscribeSubject))
    }).subscribe({
      error: () => {
        this.isLoadingChart = false;
      },
      next: ({ accountBalances, portfolioPerformance }) => {
        this.accountBalances = accountBalances.balances;

        if (portfolioPerformance.chart.length > 0) {
          this.historicalDataItems = portfolioPerformance.chart.map(
            ({ date, netWorth, netWorthInPercentage }) => ({
              date,
              value: isNumber(netWorth) ? netWorth : netWorthInPercentage
            })
          );
        } else {
          this.historicalDataItems = this.accountBalances.map(
            ({ date, valueInBaseCurrency }) => {
              return {
                date: format(date, DATE_FORMAT),
                value: valueInBaseCurrency
              };
            }
          );
        }

        this.isLoadingChart = false;

        this.changeDetectorRef.markForCheck();
      }
    });
  }

  private fetchPortfolioHoldings() {
    this.dataService
      .fetchPortfolioHoldings({
        filters: [
          {
            type: 'ACCOUNT',
            id: this.data.accountId
          }
        ]
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        this.holdings = holdings;

        this.changeDetectorRef.markForCheck();
      });
  }

  private initialize() {
    this.fetchAccount();
    this.fetchActivities();
    this.fetchChart();
    this.fetchPortfolioHoldings();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
