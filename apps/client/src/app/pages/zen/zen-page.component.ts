import { ViewportScroller } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { LineChartItem } from '@ghostfolio/client/components/line-chart/interfaces/line-chart.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PortfolioPerformance,
  Position,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-zen-page',
  templateUrl: './zen-page.html',
  styleUrls: ['./zen-page.scss']
})
export class ZenPageComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('positionsContainer') positionsContainer: ElementRef;

  public currentTabIndex = 0;
  public dateRange: DateRange = 'max';
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public hasPositions: boolean;
  public historicalDataItems: LineChartItem[];
  public isLoadingPerformance = true;
  public performance: PortfolioPerformance;
  public positions: Position[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService,
    private viewportScroller: ViewportScroller
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

          this.changeDetectorRef.markForCheck();
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

    this.update();
  }

  public ngAfterViewInit(): void {
    this.route.fragment
      .pipe(first())
      .subscribe((fragment) => this.viewportScroller.scrollToAnchor(fragment));
  }

  public onTabChanged(event: MatTabChangeEvent) {
    this.currentTabIndex = event.index;

    this.update();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    if (this.currentTabIndex === 0) {
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
    } else if (this.currentTabIndex === 1) {
      this.dataService
        .fetchPositions({ range: this.dateRange })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe((response) => {
          this.positions = response.positions;
          this.hasPositions = this.positions?.length > 0;

          this.changeDetectorRef.markForCheck();
        });
    }

    this.changeDetectorRef.markForCheck();
  }
}
