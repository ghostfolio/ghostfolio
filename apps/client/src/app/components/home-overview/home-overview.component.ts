import { GfPortfolioPerformanceComponent } from '@ghostfolio/client/components/portfolio-performance/portfolio-performance.component';
import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_CURRENCY,
  DEFAULT_DATE_RANGE,
  DEFAULT_OVERVIEW_CHART_MODE,
  NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
} from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  HistoricalDataItem,
  LineChartItem,
  PortfolioPerformance,
  User,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { OverviewChartMode, ToggleOption } from '@ghostfolio/common/types';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { DataService } from '@ghostfolio/ui/services';
import { GfToggleComponent } from '@ghostfolio/ui/toggle';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { isEqual, isNumber, omit } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfLineChartComponent,
    GfPortfolioPerformanceComponent,
    GfToggleComponent,
    MatButtonModule,
    RouterModule
  ],
  selector: 'gf-home-overview',
  styleUrls: ['./home-overview.scss'],
  templateUrl: './home-overview.html'
})
export class GfHomeOverviewComponent implements OnInit {
  protected readonly chart = signal<HistoricalDataItem[] | null>(null);
  protected readonly errors = signal<AssetProfileIdentifier[]>([]);
  protected readonly hasImpersonationId = signal(false);
  protected readonly isLoadingPerformance = signal(true);
  protected readonly netWorthLabel = $localize`Net Worth`;
  protected readonly overviewChartMode = signal<OverviewChartMode>(
    DEFAULT_OVERVIEW_CHART_MODE
  );
  protected readonly overviewChartModeOptions: ToggleOption[] = [
    {
      label: $localize`Investments`,
      value: 'PERFORMANCE' satisfies OverviewChartMode
    },
    {
      label: $localize`Net Worth`,
      value: 'NET_WORTH' satisfies OverviewChartMode
    }
  ];
  protected readonly performance = signal<PortfolioPerformance | null>(null);
  protected readonly performanceLabel = $localize`Performance`;
  protected readonly user = signal<User | null>(null);

  protected readonly routerLinkAccounts = internalRoutes.accounts.routerLink;
  protected readonly routerLinkPortfolio = internalRoutes.portfolio.routerLink;
  protected readonly routerLinkPortfolioActivities =
    internalRoutes.portfolio.subRoutes.activities.routerLink;
  protected readonly routerLinkPortfolioActivitiesCreate =
    internalRoutes.portfolio.subRoutes.activities.subRoutes.create.routerLink;

  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  protected readonly hasPermissionToCreateActivity = computed(() => {
    return (
      hasPermission(this.user()?.permissions, permissions.createActivity) &&
      hasScope(this.user()?.scopes, scopes.activityCreate)
    );
  });

  protected readonly showDetails = computed(() => {
    const user = this.user();

    return user
      ? !user.settings.isRestrictedView && user.settings.viewMode !== 'ZEN'
      : false;
  });

  protected readonly unit = computed(() => {
    return this.showDetails()
      ? (this.user()?.settings?.baseCurrency ?? DEFAULT_CURRENCY)
      : '%';
  });

  protected readonly chartCurrency = computed(() => {
    return this.overviewChartMode() === 'NET_WORTH'
      ? (this.user()?.settings?.baseCurrency ?? DEFAULT_CURRENCY)
      : undefined;
  });

  protected readonly chartLabel = computed(() => {
    return this.overviewChartMode() === 'NET_WORTH'
      ? this.netWorthLabel
      : this.performanceLabel;
  });

  protected readonly chartUnit = computed(() => {
    return this.chartCurrency() ? undefined : '%';
  });

  protected readonly precision = computed(() => {
    const currentValue =
      (this.overviewChartMode() === 'NET_WORTH'
        ? this.performance()?.currentNetWorth
        : this.performance()?.currentValueInBaseCurrency) ?? 0;

    return this.deviceType() === 'mobile' &&
      currentValue >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
      ? 0
      : 2;
  });

  protected readonly netWorthChange = computed(() => {
    const chart = this.chart();

    if (!chart?.length) {
      return undefined;
    }

    const netWorthEnd = chart[chart.length - 1].netWorth;
    const netWorthStart = chart[0].netWorth;

    return isNumber(netWorthStart) && isNumber(netWorthEnd)
      ? netWorthEnd - netWorthStart
      : undefined;
  });

  protected readonly netWorthChangeInPercentage = computed(() => {
    const netWorthChange = this.netWorthChange();
    const netWorthStart = this.chart()?.[0]?.netWorth;

    // A date range starting before the first activity has a net worth of 0,
    // for which a relative change is not defined
    return isNumber(netWorthChange) && netWorthStart
      ? netWorthChange / netWorthStart
      : undefined;
  });

  protected readonly historicalDataItems = computed<LineChartItem[] | null>(
    () => {
      const chart = this.chart();

      if (!chart) {
        return null;
      }

      if (this.overviewChartMode() === 'NET_WORTH') {
        return chart.map(({ date, netWorth }) => {
          return { date, value: netWorth ?? 0 };
        });
      }

      return chart.map(
        ({ date, netPerformanceInPercentageWithCurrencyEffect }) => {
          return {
            date,
            value: (netPerformanceInPercentageWithCurrencyEffect ?? 0) * 100
          };
        }
      );
    }
  );

  private previousUserSettings: Omit<UserSettings, 'overviewChartMode'>;

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly layoutService = inject(LayoutService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user.set(state.user);

          // The net worth is not exposed in the restricted view and in the
          // ZEN mode, where the chart mode is therefore not offered
          this.overviewChartMode.set(
            this.showDetails()
              ? (state.user.settings?.overviewChartMode ??
                  DEFAULT_OVERVIEW_CHART_MODE)
              : DEFAULT_OVERVIEW_CHART_MODE
          );

          // The chart mode is applied on the client, so changing it alone must
          // not refetch the portfolio performance
          const userSettings = omit(state.user.settings, 'overviewChartMode');

          if (!isEqual(userSettings, this.previousUserSettings)) {
            this.previousUserSettings = userSettings;

            this.update();
          }
        }
      });
  }

  public ngOnInit() {
    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId.set(!!impersonationId);
      });

    this.layoutService.shouldReloadContent$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.update();
      });
  }

  protected onChangeOverviewChartMode(overviewChartMode: OverviewChartMode) {
    this.overviewChartMode.set(overviewChartMode);

    this.dataService
      .putUserSetting({ overviewChartMode })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      });
  }

  private update() {
    this.chart.set(null);
    this.isLoadingPerformance.set(true);

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user()?.settings?.dateRange ?? DEFAULT_DATE_RANGE
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ chart, errors, performance }) => {
        this.errors.set(errors ?? []);
        this.performance.set(performance);

        this.chart.set(chart ?? null);

        this.isLoadingPerformance.set(false);
      });
  }
}
