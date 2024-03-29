import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { downloadAsFile } from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  HistoricalDataItem,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
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
import { Big } from 'big.js';
import { format, parseISO } from 'date-fns';
import { isNumber } from 'lodash';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-account-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'account-detail-dialog.html',
  styleUrls: ['./account-detail-dialog.component.scss']
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

    this.fetchAccountBalances();
    this.fetchActivities();
    this.fetchPortfolioPerformance();
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onDeleteAccountBalance(aId: string) {
    this.dataService
      .deleteAccountBalance(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.fetchAccountBalances();
          this.fetchPortfolioPerformance();
        }
      });
  }

  public onExport() {
    let activityIds = this.dataSource.data.map(({ id }) => {
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

  private fetchAccountBalances() {
    this.dataService
      .fetchAccountBalances(this.data.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ balances }) => {
        this.accountBalances = balances;

        this.changeDetectorRef.markForCheck();
      });
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

  private fetchPortfolioPerformance() {
    this.isLoadingChart = true;

    this.dataService
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
      .subscribe(({ chart }) => {
        this.historicalDataItems = chart.map(
          ({ date, netWorth, netWorthInPercentage }) => {
            return {
              date,
              value:
                this.data.hasImpersonationId ||
                this.user.settings.isRestrictedView
                  ? netWorthInPercentage
                  : netWorth
            };
          }
        );

        this.isLoadingChart = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
