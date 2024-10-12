import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  HistoricalDataItem,
  PortfolioInvestments,
  PortfolioPerformance,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { DateRange, GroupBy, ToggleOption } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { SymbolProfile } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { isNumber, sortBy } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-analysis-page',
  styleUrls: ['./analysis-page.scss'],
  templateUrl: './analysis-page.html'
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
  public benchmark: Partial<SymbolProfile>;
  public benchmarkDataItems: HistoricalDataItem[] = [];
  public benchmarks: Partial<SymbolProfile>[];
  public bottom3: PortfolioPosition[];
  public dateRangeOptions = ToggleComponent.DEFAULT_DATE_RANGE_OPTIONS;
  public timeWeightedPerformanceOptions = [
    { label: $localize`No`, value: 'N' },
    { label: $localize`Both`, value: 'B' },
    { label: $localize`Only`, value: 'O' }
  ];
  public selectedTimeWeightedPerformanceOption: string;
  public daysInMarket: number;
  public deviceType: string;
  public dividendsByGroup: InvestmentItem[];
  public dividendTimelineDataLabel = $localize`Dividend`;
  public firstOrderDate: Date;
  public hasImpersonationId: boolean;
  public investments: InvestmentItem[];
  public investmentTimelineDataLabel = $localize`Investment`;
  public investmentsByGroup: InvestmentItem[];
  public isLoadingBenchmarkComparator: boolean;
  public isLoadingDividendTimelineChart: boolean;
  public isLoadingInvestmentChart: boolean;
  public isLoadingInvestmentTimelineChart: boolean;
  public mode: GroupBy = 'month';
  public modeOptions: ToggleOption[] = [
    { label: $localize`Monthly`, value: 'month' },
    { label: $localize`Yearly`, value: 'year' }
  ];
  public performance: PortfolioPerformance;
  public performanceDataItems: HistoricalDataItem[];
  public performanceDataItemsInPercentage: HistoricalDataItem[];
  public performanceDataItemsTimeWeightedInPercentage: HistoricalDataItem[] =
    [];
  public portfolioEvolutionDataLabel = $localize`Investment`;
  public streaks: PortfolioInvestments['streaks'];
  public timeWeightedPerformance: string = 'N';
  public top3: PortfolioPosition[];
  public unitCurrentStreak: string;
  public unitLongestStreak: string;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    const { benchmarks } = this.dataService.fetchInfo();
    this.benchmarks = benchmarks;
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
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.benchmark = this.benchmarks.find(({ id }) => {
            return id === this.user.settings?.benchmark;
          });

          this.update();
        }
      });
  }

  public onChangeBenchmark(symbolProfileId: string) {
    this.dataService
      .putUserSetting({ benchmark: symbolProfileId })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
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

  public onTimeWeightedPerformanceChanged(timeWeightedPerformance: string) {
    this.timeWeightedPerformance = timeWeightedPerformance;

    this.update();
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
    this.isLoadingDividendTimelineChart = true;
    this.isLoadingInvestmentTimelineChart = true;

    this.dataService
      .fetchDividends({
        filters: this.userService.getFilters(),
        groupBy: this.mode,
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ dividends }) => {
        this.dividendsByGroup = dividends;

        this.isLoadingDividendTimelineChart = false;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchInvestments({
        filters: this.userService.getFilters(),
        groupBy: this.mode,
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ investments, streaks }) => {
        this.investmentsByGroup = investments;
        this.streaks = streaks;
        this.unitCurrentStreak =
          this.mode === 'year'
            ? this.streaks?.currentStreak === 1
              ? translate('YEAR')
              : translate('YEARS')
            : this.streaks?.currentStreak === 1
              ? translate('MONTH')
              : translate('MONTHS');
        this.unitLongestStreak =
          this.mode === 'year'
            ? this.streaks?.longestStreak === 1
              ? translate('YEAR')
              : translate('YEARS')
            : this.streaks?.longestStreak === 1
              ? translate('MONTH')
              : translate('MONTHS');

        this.isLoadingInvestmentTimelineChart = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private update() {
    this.isLoadingInvestmentChart = true;

    this.dataService
      .fetchPortfolioPerformance({
        filters: this.userService.getFilters(),
        range: this.user?.settings?.dateRange,
        timeWeightedPerformance:
          this.timeWeightedPerformance === 'N' ? false : true
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart, firstOrderDate, performance }) => {
        this.firstOrderDate = firstOrderDate ?? new Date();
        this.daysInMarket = differenceInDays(new Date(), firstOrderDate);

        this.investments = [];
        this.performance = performance;
        this.performanceDataItems = [];
        this.performanceDataItemsInPercentage = [];
        this.performanceDataItemsTimeWeightedInPercentage = [];

        for (const [
          index,
          {
            date,
            netPerformanceInPercentageWithCurrencyEffect,
            totalInvestmentValueWithCurrencyEffect,
            valueInPercentage,
            valueWithCurrencyEffect
          }
        ] of chart.entries()) {
          if (index > 0 || this.user?.settings?.dateRange === 'max') {
            // Ignore first item where value is 0
            this.investments.push({
              date,
              investment: totalInvestmentValueWithCurrencyEffect
            });
            this.performanceDataItems.push({
              date,
              value: isNumber(valueWithCurrencyEffect)
                ? valueWithCurrencyEffect
                : valueInPercentage
            });
          }
          this.performanceDataItemsInPercentage.push({
            date,
            value: netPerformanceInPercentageWithCurrencyEffect
          });
          if ((this.timeWeightedPerformance ?? 'N') !== 'N') {
            this.performanceDataItemsTimeWeightedInPercentage.push({
              date,
              value: chart[index].timeWeightedPerformance
            });
          }
        }

        this.isLoadingInvestmentChart = false;

        this.updateBenchmarkDataItems();

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPortfolioHoldings({
        filters: this.userService.getFilters(),
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        const holdingsSorted = sortBy(
          holdings.filter(({ netPerformancePercentWithCurrencyEffect }) => {
            return isNumber(netPerformancePercentWithCurrencyEffect);
          }),
          'netPerformancePercentWithCurrencyEffect'
        ).reverse();

        this.top3 = holdingsSorted.slice(0, 3);

        if (holdings?.length > 3) {
          this.bottom3 = holdingsSorted.slice(-3).reverse();
        } else {
          this.bottom3 = [];
        }

        this.changeDetectorRef.markForCheck();
      });

    this.fetchDividendsAndInvestments();
    this.changeDetectorRef.markForCheck();
  }

  private updateBenchmarkDataItems() {
    this.benchmarkDataItems = [];

    if (this.user.settings.benchmark) {
      const { dataSource, symbol } =
        this.benchmarks.find(({ id }) => {
          return id === this.user.settings.benchmark;
        }) ?? {};

      if (dataSource && symbol) {
        this.isLoadingBenchmarkComparator = true;

        this.dataService
          .fetchBenchmarkForUser({
            dataSource,
            symbol,
            range: this.user?.settings?.dateRange,
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
      }
    }
  }
}
