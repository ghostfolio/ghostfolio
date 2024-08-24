import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { NUMERICAL_PRECISION_THRESHOLD } from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  LineChartItem,
  PortfolioPerformance,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-overview',
  styleUrls: ['./home-overview.scss'],
  templateUrl: './home-overview.html'
})
export class HomeOverviewComponent implements OnDestroy, OnInit {
  public dateRangeOptions = ToggleComponent.DEFAULT_DATE_RANGE_OPTIONS;
  public deviceType: string;
  public errors: AssetProfileIdentifier[];
  public hasError: boolean;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public historicalDataItems: LineChartItem[];
  public isAllTimeHigh: boolean;
  public isAllTimeLow: boolean;
  public isLoadingPerformance = true;
  public performance: PortfolioPerformance;
  public precision = 2;
  public showDetails = false;
  public unit: string;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private layoutService: LayoutService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateOrder = hasPermission(
            this.user.permissions,
            permissions.createOrder
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

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;

        this.changeDetectorRef.markForCheck();
      });

    this.layoutService.shouldReloadContent$
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.update();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.historicalDataItems = null;
    this.isLoadingPerformance = true;

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart, errors, performance }) => {
        this.errors = errors;
        this.performance = performance;

        this.historicalDataItems = chart.map(
          ({ date, netPerformanceInPercentageWithCurrencyEffect }) => {
            return {
              date,
              value: netPerformanceInPercentageWithCurrencyEffect * 100
            };
          }
        );

        if (
          this.deviceType === 'mobile' &&
          this.performance.currentValueInBaseCurrency >=
            NUMERICAL_PRECISION_THRESHOLD
        ) {
          this.precision = 0;
        }

        this.isLoadingPerformance = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
