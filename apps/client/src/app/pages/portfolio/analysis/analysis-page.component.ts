import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PositionDetailDialogParams } from '@ghostfolio/client/components/position/position-detail-dialog/interfaces/interfaces';
import { PositionDetailDialog } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.component';
import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  Filter,
  HistoricalDataItem,
  Position,
  User
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange, GroupBy, ToggleOption } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import { AssetClass, DataSource, SymbolProfile } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { isNumber, sortBy } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-analysis-page',
  styleUrls: ['./analysis-page.scss'],
  templateUrl: './analysis-page.html'
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
  public activeFilters: Filter[] = [];
  public allFilters: Filter[];
  public benchmarkDataItems: HistoricalDataItem[] = [];
  public benchmarks: Partial<SymbolProfile>[];
  public bottom3: Position[];
  public dateRangeOptions = ToggleComponent.DEFAULT_DATE_RANGE_OPTIONS;
  public daysInMarket: number;
  public deviceType: string;
  public dividendsByGroup: InvestmentItem[];
  public dividendTimelineDataLabel = $localize`Dividend`;
  public filters$ = new Subject<Filter[]>();
  public firstOrderDate: Date;
  public hasImpersonationId: boolean;
  public investments: InvestmentItem[];
  public investmentTimelineDataLabel = $localize`Deposit`;
  public investmentsByGroup: InvestmentItem[];
  public isLoadingBenchmarkComparator: boolean;
  public isLoadingInvestmentChart: boolean;
  public mode: GroupBy = 'month';
  public modeOptions: ToggleOption[] = [
    { label: $localize`Monthly`, value: 'month' },
    { label: $localize`Yearly`, value: 'year' }
  ];
  public performanceDataItems: HistoricalDataItem[];
  public performanceDataItemsInPercentage: HistoricalDataItem[];
  public placeholder = '';
  public portfolioEvolutionDataLabel = $localize`Deposit`;
  public top3: Position[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private dialog: MatDialog,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    const { benchmarks } = this.dataService.fetchInfo();
    this.benchmarks = benchmarks;

    route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
          params['dataSource'] &&
          params['positionDetailDialog'] &&
          params['symbol']
        ) {
          this.openPositionDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        }
      });
  }

  get savingsRate() {
    const savingsRatePerMonth =
      this.hasImpersonationId || this.user.settings.isRestrictedView
        ? undefined
        : this.user?.settings?.savingsRate;

    return this.mode === 'year'
      ? savingsRatePerMonth * 12
      : savingsRatePerMonth;
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.filters$
      .pipe(
        distinctUntilChanged(),
        map((filters) => {
          this.activeFilters = filters;
          this.placeholder =
            this.activeFilters.length <= 0
              ? $localize`Filter by account or tag...`
              : '';

          this.update();
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(() => {});

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          const accountFilters: Filter[] = this.user.accounts
            .filter(({ accountType }) => {
              return accountType === 'SECURITIES';
            })
            .map(({ id, name }) => {
              return {
                id,
                label: name,
                type: 'ACCOUNT'
              };
            });

          const assetClassFilters: Filter[] = [];
          for (const assetClass of Object.keys(AssetClass)) {
            assetClassFilters.push({
              id: assetClass,
              label: translate(assetClass),
              type: 'ASSET_CLASS'
            });
          }

          const tagFilters: Filter[] = this.user.tags.map(({ id, name }) => {
            return {
              id,
              label: translate(name),
              type: 'TAG'
            };
          });

          this.allFilters = [
            ...accountFilters,
            ...assetClassFilters,
            ...tagFilters
          ];

          this.update();
        }
      });
  }

  public onChangeBenchmark(symbolProfileId: string) {
    this.dataService
      .putUserSetting({ benchmark: symbolProfileId })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onChangeDateRange(dateRange: DateRange) {
    this.dataService
      .putUserSetting({ dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onChangeGroupBy(aMode: GroupBy) {
    this.mode = aMode;
    this.fetchDividendsAndInvestments();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchDividendsAndInvestments() {
    this.dataService
      .fetchDividends({
        filters: this.activeFilters,
        groupBy: this.mode,
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ dividends }) => {
        this.dividendsByGroup = dividends;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchInvestments({
        filters: this.activeFilters,
        groupBy: this.mode,
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ investments }) => {
        this.investmentsByGroup = investments;

        this.changeDetectorRef.markForCheck();
      });
  }

  private openPositionDialog({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(PositionDetailDialog, {
          autoFocus: false,
          data: <PositionDetailDialogParams>{
            dataSource,
            symbol,
            baseCurrency: this.user?.settings?.baseCurrency,
            colorScheme: this.user?.settings?.colorScheme,
            deviceType: this.deviceType,
            hasImpersonationId: this.hasImpersonationId,
            hasPermissionToReportDataGlitch: hasPermission(
              this.user?.permissions,
              permissions.reportDataGlitch
            ),
            locale: this.user?.settings?.locale
          },
          height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }

  private update() {
    this.isLoadingBenchmarkComparator = true;
    this.isLoadingInvestmentChart = true;

    this.dataService
      .fetchPortfolioPerformance({
        filters: this.activeFilters,
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart, firstOrderDate }) => {
        this.firstOrderDate = firstOrderDate ?? new Date();
        this.daysInMarket = differenceInDays(new Date(), firstOrderDate);

        this.investments = [];
        this.performanceDataItems = [];
        this.performanceDataItemsInPercentage = [];

        for (const {
          date,
          netPerformanceInPercentage,
          totalInvestment,
          value,
          valueInPercentage
        } of chart) {
          this.investments.push({ date, investment: totalInvestment });
          this.performanceDataItems.push({
            date,
            value: isNumber(value) ? value : valueInPercentage
          });
          this.performanceDataItemsInPercentage.push({
            date,
            value: netPerformanceInPercentage
          });
        }

        this.isLoadingInvestmentChart = false;

        this.updateBenchmarkDataItems();

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPositions({
        filters: this.activeFilters,
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ positions }) => {
        const positionsSorted = sortBy(
          positions,
          'netPerformancePercentage'
        ).reverse();

        this.top3 = positionsSorted.slice(0, 3);

        if (positions?.length > 3) {
          this.bottom3 = positionsSorted.slice(-3).reverse();
        } else {
          this.bottom3 = [];
        }

        this.changeDetectorRef.markForCheck();
      });

    this.fetchDividendsAndInvestments();
    this.changeDetectorRef.markForCheck();
  }

  private updateBenchmarkDataItems() {
    if (this.user.settings.benchmark) {
      const { dataSource, symbol } =
        this.benchmarks.find(({ id }) => {
          return id === this.user.settings.benchmark;
        }) ?? {};

      this.dataService
        .fetchBenchmarkBySymbol({
          dataSource,
          symbol,
          startDate: this.firstOrderDate
        })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ marketData }) => {
          this.benchmarkDataItems = marketData.map(({ date, value }) => {
            return {
              date,
              value
            };
          });

          this.isLoadingBenchmarkComparator = false;

          this.changeDetectorRef.markForCheck();
        });
    } else {
      this.benchmarkDataItems = [];

      this.isLoadingBenchmarkComparator = false;
    }
  }
}
