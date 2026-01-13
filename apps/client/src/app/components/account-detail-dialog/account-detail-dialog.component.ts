import { GfInvestmentChartComponent } from '@ghostfolio/client/components/investment-chart/investment-chart.component';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { NUMERICAL_PRECISION_THRESHOLD_6_FIGURES } from '@ghostfolio/common/config';
import { CreateAccountBalanceDto } from '@ghostfolio/common/dtos';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  Activity,
  HistoricalDataItem,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { GfAccountBalancesComponent } from '@ghostfolio/ui/account-balances';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Big } from 'big.js';
import { format, parseISO } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  albumsOutline,
  cashOutline,
  swapVerticalOutline
} from 'ionicons/icons';
import { isNumber } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    CommonModule,
    GfAccountBalancesComponent,
    GfActivitiesTableComponent,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfHoldingsTableComponent,
    GfInvestmentChartComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-account-detail-dialog',
  styleUrls: ['./account-detail-dialog.component.scss'],
  templateUrl: 'account-detail-dialog.html'
})
export class GfAccountDetailDialogComponent implements OnDestroy, OnInit {
  public accountBalances: AccountBalancesResponse['balances'];
  public activities: OrderWithAccount[];
  public balance: number;
  public balancePrecision = 2;
  public currency: string;
  public dataSource: MatTableDataSource<Activity>;
  public dividendInBaseCurrency: number;
  public dividendInBaseCurrencyPrecision = 2;
  public equity: number;
  public equityPrecision = 2;
  public hasPermissionToDeleteAccountBalance: boolean;
  public historicalDataItems: HistoricalDataItem[];
  public holdings: PortfolioPosition[];
  public interestInBaseCurrency: number;
  public interestInBaseCurrencyPrecision = 2;
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
    public dialogRef: MatDialogRef<GfAccountDetailDialogComponent>,
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

    addIcons({ albumsOutline, cashOutline, swapVerticalOutline });
  }

  public ngOnInit() {
    this.initialize();
  }

  public onCloneActivity(aActivity: Activity) {
    this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink,
      {
        queryParams: { activityId: aActivity.id, createDialog: true }
      }
    );

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
    this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink,
      {
        queryParams: { activityId: aActivity.id, editDialog: true }
      }
    );

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
          dividendInBaseCurrency,
          interestInBaseCurrency,
          name,
          platform,
          transactionCount,
          value,
          valueInBaseCurrency
        }) => {
          this.balance = balance;

          if (
            this.balance >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES &&
            this.data.deviceType === 'mobile'
          ) {
            this.balancePrecision = 0;
          }

          this.currency = currency;
          this.dividendInBaseCurrency = dividendInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.dividendInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.dividendInBaseCurrencyPrecision = 0;
          }

          if (isNumber(balance) && isNumber(value)) {
            this.equity = new Big(value).minus(balance).toNumber();

            if (
              this.data.deviceType === 'mobile' &&
              this.equity >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
            ) {
              this.equityPrecision = 0;
            }
          } else {
            this.equity = null;
          }

          this.interestInBaseCurrency = interestInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.interestInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.interestInBaseCurrencyPrecision = 0;
          }

          this.name = name;
          this.platformName = platform?.name ?? '-';
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
