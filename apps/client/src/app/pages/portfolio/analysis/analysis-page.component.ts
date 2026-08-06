import { GfBenchmarkComparatorComponent } from '@ghostfolio/client/components/benchmark-comparator/benchmark-comparator.component';
import { GfInvestmentChartComponent } from '@ghostfolio/client/components/investment-chart/investment-chart.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_DATE_RANGE,
  NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
} from '@ghostfolio/common/config';
import { canOpenHoldingDetail } from '@ghostfolio/common/helper';
import {
  Filter,
  HistoricalDataItem,
  InvestmentItem,
  PortfolioInvestmentsResponse,
  PortfolioPerformance,
  PortfolioPosition,
  ToggleOption,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { AiPromptMode, GroupBy } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';
import { GfToggleComponent } from '@ghostfolio/ui/toggle';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { SymbolProfile } from '@prisma/client';
import { addIcons } from 'ionicons';
import { copyOutline, ellipsisVertical, sparklesOutline } from 'ionicons/icons';
import { isNumber, sortBy } from 'lodash';
import ms from 'ms';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfAiChatComponent } from './ai-chat.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfAiChatComponent,
    GfBenchmarkComparatorComponent,
    GfInvestmentChartComponent,
    GfPremiumIndicatorComponent,
    GfToggleComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  selector: 'gf-analysis-page',
  styleUrls: ['./analysis-page.scss'],
  templateUrl: './analysis-page.html'
})
export class GfAnalysisPageComponent implements OnInit {
  protected aiChatFilters: Filter[] = [];
  protected readonly aiChatModel?: string;
  protected benchmark?: Partial<SymbolProfile>;
  protected benchmarkDataItems: HistoricalDataItem[] = [];
  protected readonly benchmarks: Partial<SymbolProfile>[];
  protected bottom3: PortfolioPosition[];
  protected dividendsByGroup: InvestmentItem[];
  protected readonly dividendTimelineDataLabel = $localize`Dividend`;
  protected hasImpersonationId: boolean;
  protected hasPermissionToAccessAiChat: boolean;
  protected hasPermissionToReadAiPrompt: boolean;
  protected readonly hasPermissionToUseAiChat: boolean;
  protected investments: InvestmentItem[];
  protected readonly investmentTimelineDataLabel = $localize`Invested Capital`;
  protected investmentsByGroup: InvestmentItem[];
  protected isLoadingAnalysisPrompt: boolean;
  protected isLoadingBenchmarkComparator: boolean;
  protected isLoadingDividendTimelineChart: boolean;
  protected isLoadingInvestmentChart: boolean;
  protected isLoadingInvestmentTimelineChart: boolean;
  protected isLoadingPortfolioPrompt: boolean;
  protected isAiChatOpen = false;
  protected readonly mode = signal<GroupBy>('month');
  protected readonly modeOptions: ToggleOption[] = [
    { label: $localize`Monthly`, value: 'month' },
    { label: $localize`Yearly`, value: 'year' }
  ];
  protected performance: PortfolioPerformance;
  protected performanceDataItems: HistoricalDataItem[];
  protected performanceDataItemsInPercentage: HistoricalDataItem[];
  protected readonly portfolioEvolutionDataLabel = $localize`Investment`;
  protected precision = 2;
  protected streaks: PortfolioInvestmentsResponse['streaks'];
  protected top3: PortfolioPosition[];
  protected unitCurrentStreak: string;
  protected unitLongestStreak: string;
  protected user: User;

  private readonly actionsMenuButton = viewChild.required(MatMenuTrigger);
  private readonly aiChatTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('aiChatTrigger');
  private readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  private dateOfFirstActivity: Date;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly clipboard = inject(Clipboard);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly snackBar = inject(MatSnackBar);
  private readonly userService = inject(UserService);

  public constructor() {
    const { aiChatModel, benchmarks, globalPermissions } =
      this.dataService.fetchInfo();
    this.aiChatModel = aiChatModel;
    this.benchmarks = benchmarks;
    this.hasPermissionToUseAiChat = hasPermission(
      globalPermissions,
      permissions.enableAiChat
    );

    addIcons({ copyOutline, ellipsisVertical, sparklesOutline });
  }

  get canUseAiChat() {
    return (
      !!this.aiChatModel &&
      this.hasPermissionToUseAiChat &&
      this.hasPermissionToAccessAiChat &&
      !!this.user?.settings?.isExperimentalFeatures &&
      !this.hasImpersonationId
    );
  }

  get savingsRate() {
    const savingsRatePerMonth =
      this.hasImpersonationId || this.user.settings.isRestrictedView
        ? undefined
        : this.user?.settings?.savingsRate;

    if (savingsRatePerMonth === undefined) {
      return undefined;
    }

    return this.mode() === 'year'
      ? savingsRatePerMonth * 12
      : savingsRatePerMonth;
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;

        if (this.hasImpersonationId) {
          this.isAiChatOpen = false;
        }

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.aiChatFilters = this.userService.getFilters().map((filter) => {
            const label =
              (filter.type === 'ACCOUNT'
                ? this.user.accounts.find(({ id }) => id === filter.id)?.name
                : filter.type === 'TAG'
                  ? this.user.tags.find(({ id }) => id === filter.id)?.name
                  : undefined) ?? undefined;

            return { ...filter, label };
          });

          this.benchmark = this.benchmarks.find(({ id }) => {
            return id === this.user.settings?.benchmark;
          });

          this.hasPermissionToAccessAiChat = hasPermission(
            this.user.permissions,
            permissions.accessAiChat
          );
          this.hasPermissionToReadAiPrompt = hasPermission(
            this.user.permissions,
            permissions.readAiPrompt
          );

          if (!this.canUseAiChat) {
            this.isAiChatOpen = false;
          }

          this.update();
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onChangeBenchmark(symbolProfileId: string) {
    this.dataService
      .putUserSetting({ benchmark: symbolProfileId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected onChangeGroupBy(aMode: GroupBy) {
    this.mode.set(aMode);
    this.fetchDividendsAndInvestments();
  }

  protected onCloseAiChat() {
    this.isAiChatOpen = false;

    queueMicrotask(() => {
      this.aiChatTrigger()?.nativeElement.focus();
    });
  }

  protected onCopyPromptToClipboard(mode: AiPromptMode) {
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            window.open('https://duck.ai', '_blank');
          });

        this.actionsMenuButton().closeMenu();

        if (mode === 'analysis') {
          this.isLoadingAnalysisPrompt = false;
        } else if (mode === 'portfolio') {
          this.isLoadingPortfolioPrompt = false;
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onToggleAiChat() {
    this.isAiChatOpen = !this.isAiChatOpen;
  }

  private fetchDividendsAndInvestments() {
    this.isLoadingDividendTimelineChart = true;
    this.isLoadingInvestmentTimelineChart = true;

    this.dataService
      .fetchDividends({
        filters: this.userService.getFilters(),
        groupBy: this.mode(),
        range: this.user?.settings?.dateRange ?? DEFAULT_DATE_RANGE
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ dividends }) => {
        this.dividendsByGroup = dividends;

        this.isLoadingDividendTimelineChart = false;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchInvestments({
        filters: this.userService.getFilters(),
        groupBy: this.mode(),
        range: this.user?.settings?.dateRange ?? DEFAULT_DATE_RANGE
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ investments, streaks }) => {
        this.investmentsByGroup = investments;
        this.streaks = streaks;
        this.unitCurrentStreak =
          this.mode() === 'year'
            ? this.streaks?.currentStreak === 1
              ? translate('YEAR')
              : translate('YEARS')
            : this.streaks?.currentStreak === 1
              ? translate('MONTH')
              : translate('MONTHS');
        this.unitLongestStreak =
          this.mode() === 'year'
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
        range: this.user?.settings?.dateRange ?? DEFAULT_DATE_RANGE
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ chart, dateOfFirstActivity, performance }) => {
        this.dateOfFirstActivity = dateOfFirstActivity ?? new Date();

        this.investments = [];
        this.performance = performance;
        this.performanceDataItems = [];
        this.performanceDataItemsInPercentage = [];

        for (const [
          index,
          {
            date,
            netPerformanceInPercentageWithCurrencyEffect,
            totalInvestmentValueWithCurrencyEffect,
            valueInPercentage,
            valueWithCurrencyEffect
          }
        ] of (chart ?? []).entries()) {
          // Ignore first item where value is 0
          if (index > 0 || this.user?.settings?.dateRange === 'max') {
            if (totalInvestmentValueWithCurrencyEffect !== undefined) {
              this.investments.push({
                date,
                investment: totalInvestmentValueWithCurrencyEffect
              });
            }

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
        }

        if (
          this.deviceType() === 'mobile' &&
          this.performance.currentValueInBaseCurrency >=
            NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
        ) {
          this.precision = 0;
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        const holdingsSorted = sortBy(
          holdings.filter((holding) => {
            return (
              canOpenHoldingDetail(holding) &&
              isNumber(holding.netPerformancePercentWithCurrencyEffect)
            );
          }),
          'netPerformancePercentWithCurrencyEffect'
        ).reverse();

        this.top3 = holdingsSorted
          .filter(
            ({ netPerformancePercentWithCurrencyEffect }) =>
              netPerformancePercentWithCurrencyEffect > 0
          )
          .slice(0, 3);

        this.bottom3 = holdingsSorted
          .filter(
            ({ netPerformancePercentWithCurrencyEffect }) =>
              netPerformancePercentWithCurrencyEffect < 0
          )
          .slice(-3)
          .reverse();

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
            range: this.user?.settings?.dateRange ?? DEFAULT_DATE_RANGE,
            startDate: this.dateOfFirstActivity
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
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
