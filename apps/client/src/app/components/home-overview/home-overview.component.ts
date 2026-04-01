import { GfPortfolioPerformanceComponent } from '@ghostfolio/client/components/portfolio-performance/portfolio-performance.component';
import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { NUMERICAL_PRECISION_THRESHOLD_6_FIGURES } from '@ghostfolio/common/config';
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

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  imports: [
    CommonModule,
    GfLineChartComponent,
    GfPortfolioPerformanceComponent,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-overview',
  styleUrls: ['./home-overview.scss'],
  templateUrl: './home-overview.html'
})
export class GfHomeOverviewComponent implements OnInit {
  public deviceType: string;
  public errors: AssetProfileIdentifier[];
  public hasError: boolean;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateActivity: boolean;
  public historicalDataItems: LineChartItem[];
  public isAllTimeHigh: boolean;
  public isAllTimeLow: boolean;
  public isLoadingPerformance = true;
  public performance: PortfolioPerformance;
  public performanceLabel = $localize`Performance`;
  public precision = 2;
  public routerLinkAccounts = internalRoutes.accounts.routerLink;
  public routerLinkPortfolio = internalRoutes.portfolio.routerLink;
  public routerLinkPortfolioActivities =
    internalRoutes.portfolio.subRoutes?.activities.routerLink;
  public showDetails = false;
  public unit: string;
  public user: User;
  private graph_type: string;
  public graph_unit: string;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private layoutService: LayoutService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateActivity = hasPermission(
            this.user.permissions,
            permissions.createActivity
          );

          this.update();
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.showDetails =
      !this.user.settings.isRestrictedView &&
      this.user.settings.viewMode !== 'ZEN';

    this.unit = this.showDetails ? this.user.settings.baseCurrency : '%';

    this.graph_type = !this.showDetails
      ? 'netPerformanceInPercentageWithCurrencyEffect'
      : (localStorage.getItem('home_overview_graph_type') ??
        'netPerformanceInPercentageWithCurrencyEffect');

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;

        this.changeDetectorRef.markForCheck();
      });

    this.layoutService.shouldReloadContent$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.update();
      });
  }

  private update() {
    this.historicalDataItems = null;
    this.isLoadingPerformance = true;

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ chart, errors, performance }) => {
        this.errors = errors;
        this.performance = performance;

        const graph_multiplier =
          this.graph_type === 'netPerformanceInPercentageWithCurrencyEffect'
            ? 100
            : 1;
        this.graph_unit =
          this.graph_type === 'netPerformanceInPercentageWithCurrencyEffect'
            ? '%'
            : this.unit;

        this.historicalDataItems = chart.map((item) => {
          return {
            date: item.date,
            value: item[this.graph_type] * graph_multiplier
          };
        });

        if (
          this.deviceType === 'mobile' &&
          this.performance.currentValueInBaseCurrency >=
            NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
        ) {
          this.precision = 0;
        }

        this.isLoadingPerformance = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }

  public onMetricClick(selectedgraph_type: string): void {
    if (this.graph_type !== selectedgraph_type) {
      this.graph_type = selectedgraph_type;
      localStorage.setItem('home_overview_graph_type', this.graph_type);
      this.update();
    }
  }
}
