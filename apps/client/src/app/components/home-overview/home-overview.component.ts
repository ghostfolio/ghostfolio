import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToggleOption } from '@ghostfolio/client/components/toggle/interfaces/toggle-option.type';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import {
  RANGE,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioPerformance, User } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { LineChartItem } from '@ghostfolio/ui/line-chart/interfaces/line-chart.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-overview',
  styleUrls: ['./home-overview.scss'],
  templateUrl: './home-overview.html'
})
export class HomeOverviewComponent implements OnDestroy, OnInit {
  public dateRange: DateRange;
  public dateRangeOptions: ToggleOption[] = [
    { label: 'Today', value: '1d' },
    { label: 'YTD', value: 'ytd' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' },
    { label: 'Max', value: 'max' }
  ];
  public hasImpersonationId: boolean;
  public historicalDataItems: LineChartItem[];
  public isAllTimeHigh: boolean;
  public isAllTimeLow: boolean;
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
    private impersonationStorageService: ImpersonationStorageService,
    private settingsStorageService: SettingsStorageService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
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
