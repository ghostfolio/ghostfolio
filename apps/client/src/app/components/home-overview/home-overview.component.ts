import { GfPortfolioPerformanceComponent } from '@ghostfolio/client/components/portfolio-performance/portfolio-performance.component';
import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_CURRENCY,
  DEFAULT_DATE_RANGE,
  NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
} from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  LineChartItem,
  PortfolioPerformance,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { DataService } from '@ghostfolio/ui/services';

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
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfLineChartComponent,
    GfPortfolioPerformanceComponent,
    MatButtonModule,
    RouterModule
  ],
  selector: 'gf-home-overview',
  styleUrls: ['./home-overview.scss'],
  templateUrl: './home-overview.html'
})
export class GfHomeOverviewComponent implements OnInit {
  protected readonly errors = signal<AssetProfileIdentifier[]>([]);
  protected readonly hasImpersonationId = signal(false);
  protected readonly historicalDataItems = signal<LineChartItem[] | null>(null);
  protected readonly isLoadingPerformance = signal(true);
  protected readonly performance = signal<PortfolioPerformance | null>(null);
  protected readonly performanceLabel = $localize`Performance`;
  protected readonly precision = signal(2);
  protected readonly user = signal<User | null>(null);

  protected readonly routerLinkAccounts = internalRoutes.accounts.routerLink;
  protected readonly routerLinkPortfolio = internalRoutes.portfolio.routerLink;
  protected readonly routerLinkPortfolioActivities =
    internalRoutes.portfolio.subRoutes.activities.routerLink;

  // Computed signals
  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  protected readonly hasPermissionToCreateActivity = computed(() => {
    return hasPermission(this.user()?.permissions, permissions.createActivity);
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
          this.update();
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

  private update() {
    this.historicalDataItems.set(null);
    this.isLoadingPerformance.set(true);

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user()?.settings?.dateRange ?? DEFAULT_DATE_RANGE
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ chart, errors, performance }) => {
        this.errors.set(errors ?? []);
        this.performance.set(performance);

        this.historicalDataItems.set(
          chart?.map(
            ({ date, netPerformanceInPercentageWithCurrencyEffect }) => {
              return {
                date,
                value: (netPerformanceInPercentageWithCurrencyEffect ?? 0) * 100
              };
            }
          ) ?? null
        );

        this.precision.set(2);

        if (
          this.deviceType() === 'mobile' &&
          performance.currentValueInBaseCurrency >=
            NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
        ) {
          this.precision.set(0);
        }

        this.isLoadingPerformance.set(false);
      });
  }
}
