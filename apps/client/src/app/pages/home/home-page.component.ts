import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { LineChartItem } from '@ghostfolio/client/components/line-chart/interfaces/line-chart.interface';
import { PerformanceChartDialog } from '@ghostfolio/client/components/performance-chart-dialog/performance-chart-dialog.component';
import { ToggleOption } from '@ghostfolio/client/components/toggle/interfaces/toggle-option.type';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import {
  RANGE,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { ghostfolioFearAndGreedIndexSymbol } from '@ghostfolio/common/config';
import {
  PortfolioPerformance,
  PortfolioSummary,
  Position,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DateRange } from '@ghostfolio/common/types';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-page',
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.scss']
})
export class HomePageComponent implements OnDestroy, OnInit {
  @HostBinding('class.with-create-account-container') get isDemo() {
    return this.canCreateAccount;
  }

  @ViewChild('positionsContainer') positionsContainer: ElementRef;

  public canCreateAccount: boolean;
  public currentTabIndex = 0;
  public dateRange: DateRange;
  public dateRangeOptions: ToggleOption[] = [
    { label: 'Today', value: '1d' },
    { label: 'YTD', value: 'ytd' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' },
    { label: 'Max', value: 'max' }
  ];
  public deviceType: string;
  public fearAndGreedIndex: number;
  public hasImpersonationId: boolean;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public hasPermissionToCreateOrder: boolean;
  public hasPositions: boolean;
  public historicalDataItems: LineChartItem[];
  public isLoadingPerformance = true;
  public isLoadingSummary = true;
  public performance: PortfolioPerformance;
  public positions: Position[];
  public routeQueryParams: Subscription;
  public summary: PortfolioSummary;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private userService: UserService
  ) {
    this.routeQueryParams = this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['performanceChartDialog']) {
          this.openDialog();
        }
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.canCreateAccount = hasPermission(
            this.user?.permissions,
            permissions.createUserAccount
          );

          this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
            this.user.permissions,
            permissions.accessFearAndGreedIndex
          );

          if (this.hasPermissionToAccessFearAndGreedIndex) {
            this.dataService
              .fetchSymbolItem(ghostfolioFearAndGreedIndexSymbol)
              .pipe(takeUntil(this.unsubscribeSubject))
              .subscribe(({ marketPrice }) => {
                this.fearAndGreedIndex = marketPrice;

                this.changeDetectorRef.markForCheck();
              });
          }

          this.hasPermissionToCreateOrder = hasPermission(
            this.user.permissions,
            permissions.createOrder
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

        this.changeDetectorRef.markForCheck();
      });

    this.dateRange =
      <DateRange>this.settingsStorageService.getSetting(RANGE) || 'max';

    this.update();
  }

  public onChangeDateRange(aDateRange: DateRange) {
    this.dateRange = aDateRange;
    this.settingsStorageService.setSetting(RANGE, this.dateRange);
    this.update();
  }

  public onTabChanged(event: MatTabChangeEvent) {
    this.currentTabIndex = event.index;

    this.update();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openDialog(): void {
    const dialogRef = this.dialog.open(PerformanceChartDialog, {
      autoFocus: false,
      data: {
        deviceType: this.deviceType,
        fearAndGreedIndex: this.fearAndGreedIndex,
        historicalDataItems: this.historicalDataItems
      },
      width: '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.router.navigate(['.'], { relativeTo: this.route });
      });
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
    } else if (this.currentTabIndex === 2) {
      this.isLoadingSummary = true;

      this.dataService
        .fetchPortfolioSummary()
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe((response) => {
          this.summary = response;
          this.isLoadingSummary = false;

          this.changeDetectorRef.markForCheck();
        });
    }

    this.changeDetectorRef.markForCheck();
  }
}
