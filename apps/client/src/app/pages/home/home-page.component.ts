import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { hasPermission, permissions } from '@ghostfolio/helper';
import { DateRange } from 'apps/api/src/app/portfolio/interfaces/date-range.type';
import { PortfolioOverview } from 'apps/api/src/app/portfolio/interfaces/portfolio-overview.interface';
import { PortfolioPerformance } from 'apps/api/src/app/portfolio/interfaces/portfolio-performance.interface';
import { PortfolioPosition } from 'apps/api/src/app/portfolio/interfaces/portfolio-position.interface';
import { User } from 'apps/api/src/app/user/interfaces/user.interface';
import {
  RANGE,
  SettingsStorageService
} from 'apps/client/src/app/services/settings-storage.service';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LineChartItem } from '../../components/line-chart/interfaces/line-chart.interface';
import { PerformanceChartDialog } from '../../components/performance-chart-dialog/performance-chart-dialog.component';
import { ToggleOption } from '../../components/toggle/interfaces/toggle-option.type';
import { DataService } from '../../services/data.service';
import { ImpersonationStorageService } from '../../services/impersonation-storage.service';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'gf-home-page',
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.scss']
})
export class HomePageComponent implements OnDestroy, OnInit {
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
  public hasPermissionToReadForeignPortfolio: boolean;
  public hasPositions = false;
  public historicalDataItems: LineChartItem[];
  public isLoadingOverview = true;
  public isLoadingPerformance = true;
  public overview: PortfolioOverview;
  public performance: PortfolioPerformance;
  public positions: { [symbol: string]: PortfolioPosition };
  public routeQueryParams: Subscription;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private tokenStorageService: TokenStorageService
  ) {
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['performanceChartDialog']) {
          this.openDialog();
        }
      });

    this.tokenStorageService
      .onChangeHasToken()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.fetchUser().subscribe((user) => {
          this.user = user;
          this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
            user.permissions,
            permissions.accessFearAndGreedIndex
          );

          if (this.hasPermissionToAccessFearAndGreedIndex) {
            this.dataService
              .fetchSymbolItem('GF.FEAR_AND_GREED_INDEX')
              .pipe(takeUntil(this.unsubscribeSubject))
              .subscribe(({ marketPrice }) => {
                this.fearAndGreedIndex = marketPrice;

                this.cd.markForCheck();
              });
          }

          this.hasPermissionToReadForeignPortfolio = hasPermission(
            user.permissions,
            permissions.readForeignPortfolio
          );

          this.cd.markForCheck();
        });
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
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

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  private update() {
    this.hasPositions = undefined;
    this.isLoadingOverview = true;
    this.isLoadingPerformance = true;
    this.positions = undefined;

    this.dataService
      .fetchChart({ range: this.dateRange })
      .subscribe((chartData) => {
        this.historicalDataItems = chartData.map((chartDataItem) => {
          return {
            date: chartDataItem.date,
            value: chartDataItem.value
          };
        });

        this.cd.markForCheck();
      });

    this.dataService
      .fetchPortfolioPerformance({ range: this.dateRange })
      .subscribe((response) => {
        this.performance = response;
        this.isLoadingPerformance = false;

        this.cd.markForCheck();
      });

    this.dataService.fetchPortfolioOverview().subscribe((response) => {
      this.overview = response;
      this.isLoadingOverview = false;

      this.cd.markForCheck();
    });

    this.dataService
      .fetchPortfolioPositions({ range: this.dateRange })
      .subscribe((response) => {
        this.positions = response;
        this.hasPositions =
          this.positions && Object.keys(this.positions).length > 0;

        this.cd.markForCheck();
      });

    this.cd.markForCheck();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
