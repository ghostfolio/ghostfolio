import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  LineChartItem,
  PortfolioPerformance,
  UniqueAsset,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
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
  public errors: UniqueAsset[];
  public hasError: boolean;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public historicalDataItems: LineChartItem[];
  public isAllTimeHigh: boolean;
  public isAllTimeLow: boolean;
  public isLoadingPerformance = true;
  public performance: PortfolioPerformance;
  public showDetails = false;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
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

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;

        this.changeDetectorRef.markForCheck();
      });

    this.showDetails =
      !this.hasImpersonationId &&
      !this.user.settings.isRestrictedView &&
      this.user.settings.viewMode !== 'ZEN';

    this.update();
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.isLoadingPerformance = true;

    this.dataService
      .fetchChart({
        range: this.user?.settings?.dateRange,
        version: this.user?.settings?.isExperimentalFeatures ? 2 : 1
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((chartData) => {
        this.historicalDataItems = chartData.chart.map((chartDataItem) => {
          return {
            date: chartDataItem.date,
            value: chartDataItem.value
          };
        });
        this.isAllTimeHigh = chartData.isAllTimeHigh;
        this.isAllTimeLow = chartData.isAllTimeLow;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPortfolioPerformance({ range: this.user?.settings?.dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.errors = response.errors;
        this.hasError = response.hasErrors;
        this.performance = response.performance;
        this.isLoadingPerformance = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
