import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  HistoricalDataItem,
  InvestmentItem,
  PortfolioInvestments,
  PortfolioPerformance,
  PortfolioPosition,
  ToggleOption,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type {
  AiPromptMode,
  DateRange,
  GroupBy
} from '@ghostfolio/common/types';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';
import { translate } from '@ghostfolio/ui/i18n';

import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SymbolProfile } from '@prisma/client';
import { isNumber, sortBy } from 'lodash';
import ms from 'ms';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-analysis-page',
  styleUrls: ['./analysis-page.scss'],
  templateUrl: './analysis-page.html',
  standalone: false
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
  @ViewChild(MatMenuTrigger) actionsMenuButton!: MatMenuTrigger;

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
  public hasPermissionToReadAiPrompt: boolean;
  public investments: InvestmentItem[];
  public investmentTimelineDataLabel = $localize`Investment`;
  public investmentsByGroup: InvestmentItem[];
  public isLoadingAnalysisPrompt: boolean;
  public isLoadingBenchmarkComparator: boolean;
  public isLoadingDividendTimelineChart: boolean;
  public isLoadingInvestmentChart: boolean;
  public isLoadingInvestmentTimelineChart: boolean;
  public isLoadingPortfolioPrompt: boolean;
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
  public top3: PortfolioPosition[];
  public unitCurrentStreak: string;
  public unitLongestStreak: string;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private clipboard: Clipboard,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private snackBar: MatSnackBar,
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

          this.hasPermissionToReadAiPrompt = hasPermission(
            this.user.permissions,
            permissions.readAiPrompt
          );

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

  public onChangeGroupBy(aMode: GroupBy) {
    this.mode = aMode;
    this.fetchDividendsAndInvestments();
  }

  public onCopyPromptToClipboard(mode: AiPromptMode) {
    if (mode === 'analysis') {
      this.isLoadingAnalysisPrompt = true;
    } else if (mode === 'portfolio') {
      this.isLoadingPortfolioPrompt = true;
    }

    this.dataService
      .fetchPrompt({
        mode,
        filters: this.userService.getFilters()
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ prompt }) => {
        this.clipboard.copy(prompt);

        const snackBarRef = this.snackBar.open(
          '✅ ' + $localize`AI prompt has been copied to the clipboard`,
          $localize`Open Duck.ai` + ' →',
          {
            duration: ms('7 seconds')
          }
        );

        snackBarRef
          .onAction()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(() => {
            window.open('https://duck.ai', '_blank');
          });

        this.actionsMenuButton.closeMenu();

        if (mode === 'analysis') {
          this.isLoadingAnalysisPrompt = false;
        } else if (mode === 'portfolio') {
          this.isLoadingPortfolioPrompt = false;
        }
      });
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
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart, firstOrderDate, performance }) => {
        this.firstOrderDate = firstOrderDate ?? new Date();

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
            timeWeightedPerformanceInPercentageWithCurrencyEffect,
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
            value:
              this.user?.settings?.performanceCalculationType ===
              PerformanceCalculationType.ROI
                ? timeWeightedPerformanceInPercentageWithCurrencyEffect
                : netPerformanceInPercentageWithCurrencyEffect
          });
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
            filters: this.userService.getFilters(),
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
