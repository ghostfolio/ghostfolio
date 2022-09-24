import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  Filter,
  LineChartItem,
  PortfolioPerformance,
  UniqueAsset,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { AssetClass } from '@prisma/client';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-overview',
  styleUrls: ['./home-overview.scss'],
  templateUrl: './home-overview.html'
})
export class HomeOverviewComponent implements OnDestroy, OnInit {
  public activeFilters: Filter[] = [];
  public allFilters: Filter[];
  public dateRangeOptions = ToggleComponent.DEFAULT_DATE_RANGE_OPTIONS;
  public deviceType: string;
  public errors: UniqueAsset[];
  public filterPlaceholder = '';
  public filters$ = new Subject<Filter[]>();
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
              label: assetClass,
              type: 'ASSET_CLASS'
            });
          }
          const tagFilters: Filter[] = this.user.tags.map(({ id, name }) => {
            return {
              id,
              label: name,
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

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;

        this.changeDetectorRef.markForCheck();
      });

    this.filters$
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeSubject))
      .subscribe((filters) => {
        this.activeFilters = filters;
        this.filterPlaceholder =
          this.activeFilters.length <= 0
            ? $localize`Filter by account or tag...`
            : '';
        this.update();
        this.changeDetectorRef.markForCheck();
      });

    this.showDetails =
      !this.hasImpersonationId &&
      !this.user.settings.isRestrictedView &&
      this.user.settings.viewMode !== 'ZEN';
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
    this.historicalDataItems = null;
    this.isLoadingPerformance = true;

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user?.settings?.dateRange,
        version: this.user?.settings?.isExperimentalFeatures ? 2 : 1,
        filters: this.activeFilters
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.errors = response.errors;
        this.hasError = response.hasErrors;
        this.performance = response.performance;
        this.isLoadingPerformance = false;

        if (this.user?.settings?.isExperimentalFeatures) {
          this.historicalDataItems = response.chart.map(({ date, value }) => {
            return {
              date,
              value
            };
          });
        } else {
          this.dataService
            .fetchChart({
              range: this.user?.settings?.dateRange,
              version: 1,
              filters: this.activeFilters
            })
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe((chartData) => {
              this.historicalDataItems = chartData.chart.map(
                ({ date, value }) => {
                  return {
                    date,
                    value
                  };
                }
              );
              this.isAllTimeHigh = chartData.isAllTimeHigh;
              this.isAllTimeLow = chartData.isAllTimeLow;

              this.changeDetectorRef.markForCheck();
            });
        }

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
