import { GfInvestmentChartComponent } from '@ghostfolio/client/components/investment-chart/investment-chart.component';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_DATE_RANGE,
  DEFAULT_PAGE_SIZE,
  NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
} from '@ghostfolio/common/config';
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
import { GfAccountBalancesComponent } from '@ghostfolio/ui/account-balances';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { NavigationStart, Router } from '@angular/router';
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
import { filter, forkJoin } from 'rxjs';

import {
  AccountDetailDialogParams,
  AccountDetailDialogResult
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
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
export class GfAccountDetailDialogComponent implements OnInit {
  protected accountBalances: AccountBalancesResponse['balances'];
  protected activitiesCount: number;
  protected balance: number;
  protected balancePrecision = 2;
  protected currency: string | null;
  protected dataSource: MatTableDataSource<Activity>;
  protected dividendInBaseCurrency: number;
  protected dividendInBaseCurrencyPrecision = 2;
  protected equity: number | null;
  protected equityPrecision = 2;
  protected hasPermissionToDeleteAccountBalance: boolean;
  protected historicalDataItems: HistoricalDataItem[];
  protected holdings: PortfolioPosition[];
  protected interestInBaseCurrency: number;
  protected interestInBaseCurrencyPrecision = 2;
  protected isLoadingActivities: boolean;
  protected isLoadingChart: boolean;
  protected name: string | null;
  protected pageIndex = 0;
  protected pageSize = DEFAULT_PAGE_SIZE;
  protected platformName: string;
  protected sortColumn = 'date';
  protected sortDirection: SortDirection = 'desc';
  protected totalItems: number;
  protected user: User;
  protected valueInBaseCurrency: number;

  protected readonly data = inject<AccountDetailDialogParams>(MAT_DIALOG_DATA);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<
      MatDialogRef<GfAccountDetailDialogComponent, AccountDetailDialogResult>
    >(MatDialogRef);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    this.router.events
      .pipe(
        filter((event) => {
          return event instanceof NavigationStart;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.dialogRef.close({ isNavigating: true });
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  protected onAddAccountBalance(accountBalance: CreateAccountBalanceDto) {
    this.dataService
      .postAccountBalance(accountBalance)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.initialize();
      });
  }

  protected onChangePage(page: PageEvent) {
    this.pageIndex = page.pageIndex;

    this.fetchActivities();
  }

  protected onClose() {
    this.dialogRef.close();
  }

  protected onDeleteAccountBalance(aId: string) {
    this.dataService
      .deleteAccountBalance(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.initialize();
      });
  }

  protected onExport() {
    const activityIds = this.dataSource.data.map(({ id }) => {
      return id;
    });

    this.dataService
      .fetchExport({ activityIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${this.name
            ?.replace(/\s+/g, '-')
            .toLowerCase()}-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  protected onSortChanged({ active, direction }: Sort) {
    this.sortColumn = active;
    this.sortDirection = direction;

    this.fetchActivities();
  }

  protected showValuesInPercentage() {
    return (
      this.data.hasImpersonationId || this.user?.settings?.isRestrictedView
    );
  }

  private fetchAccount() {
    this.dataService
      .fetchAccount(this.data.accountId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ({
          activitiesCount,
          balance,
          currency,
          dividendInBaseCurrency,
          interestInBaseCurrency,
          name,
          platform,
          value,
          valueInBaseCurrency
        }) => {
          this.activitiesCount = activitiesCount;
          this.balance = balance;

          if (
            this.balance >= NUMERICAL_PRECISION_THRESHOLD_4_FIGURES &&
            this.data.deviceType === 'mobile'
          ) {
            this.balancePrecision = 0;
          }

          this.currency = currency;
          this.dividendInBaseCurrency = dividendInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.dividendInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
          ) {
            this.dividendInBaseCurrencyPrecision = 0;
          }

          if (isNumber(balance) && isNumber(value)) {
            this.equity = new Big(value).minus(balance).toNumber();

            if (
              this.data.deviceType === 'mobile' &&
              this.equity >= NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
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
              NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
          ) {
            this.interestInBaseCurrencyPrecision = 0;
          }

          this.name = name;
          this.platformName = platform?.name ?? '-';
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
        skip: this.pageIndex * this.pageSize,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        take: this.pageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
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
        .pipe(takeUntilDestroyed(this.destroyRef)),
      portfolioPerformance: this.dataService
        .fetchPortfolioPerformance({
          filters: [
            {
              id: this.data.accountId,
              type: 'ACCOUNT'
            }
          ],
          range: DEFAULT_DATE_RANGE,
          withExcludedAccounts: true,
          withItems: true
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
    }).subscribe({
      error: () => {
        this.isLoadingChart = false;
      },
      next: ({ accountBalances, portfolioPerformance }) => {
        this.accountBalances = accountBalances.balances;

        if (
          portfolioPerformance.chart &&
          portfolioPerformance.chart.length > 0
        ) {
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
}
