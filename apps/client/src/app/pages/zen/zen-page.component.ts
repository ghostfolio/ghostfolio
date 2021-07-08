import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { LineChartItem } from '@ghostfolio/client/components/line-chart/interfaces/line-chart.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioPerformance, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-zen-page',
  templateUrl: './zen-page.html',
  styleUrls: ['./zen-page.scss']
})
export class ZenPageComponent implements OnDestroy, OnInit {
  public dateRange: DateRange = 'max';
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToReadForeignPortfolio: boolean;
  public historicalDataItems: LineChartItem[];
  public isLoadingPerformance = true;
  public performance: PortfolioPerformance;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
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

          this.hasPermissionToReadForeignPortfolio = hasPermission(
            this.user.permissions,
            permissions.readForeignPortfolio
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.update();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.isLoadingPerformance = true;

    this.dataService
      .fetchChart({ range: this.dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((chartData) => {
        this.historicalDataItems = chartData.map((chartDataItem) => {
          return {
            date: chartDataItem.date,
            value: chartDataItem.value
          };
        });

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPortfolioPerformance({ range: this.dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.performance = response;
        this.isLoadingPerformance = false;

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }
}
