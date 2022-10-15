import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToggleComponent } from '@ghostfolio/client/components/toggle/toggle.component';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  HistoricalDataItem,
  Position,
  User
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { DateRange, GroupBy, ToggleOption } from '@ghostfolio/common/types';
import { SymbolProfile } from '@prisma/client';
import { differenceInDays } from 'date-fns';
import { sortBy } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-analysis-page',
  styleUrls: ['./analysis-page.scss'],
  templateUrl: './analysis-page.html'
})
export class AnalysisPageComponent implements OnDestroy, OnInit {
  public benchmarkDataItems: HistoricalDataItem[] = [];
  public benchmarks: Partial<SymbolProfile>[];
  public bottom3: Position[];
  public dateRangeOptions = ToggleComponent.DEFAULT_DATE_RANGE_OPTIONS;
  public daysInMarket: number;
  public deviceType: string;
  public firstOrderDate: Date;
  public hasImpersonationId: boolean;
  public investments: InvestmentItem[];
  public investmentsByMonth: InvestmentItem[];
  public isLoadingBenchmarkComparator: boolean;
  public mode: GroupBy = 'month';
  public modeOptions: ToggleOption[] = [
    { label: $localize`Monthly`, value: 'month' }
  ];
  public performanceDataItems: HistoricalDataItem[];
  public performanceDataItemsInPercentage: HistoricalDataItem[];
  public top3: Position[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    const { benchmarks } = this.dataService.fetchInfo();
    this.benchmarks = benchmarks;
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.update();
        }
      });
  }

  public onChangeBenchmark(symbolProfileId: string) {
    this.dataService
      .putUserSetting({ benchmark: symbolProfileId })
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

  public onChangeGroupBy(aMode: GroupBy) {
    this.mode = aMode;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private update() {
    this.isLoadingBenchmarkComparator = true;

    this.dataService
      .fetchPortfolioPerformance({
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ chart, firstOrderDate }) => {
        this.firstOrderDate = firstOrderDate ?? new Date();
        this.daysInMarket = differenceInDays(new Date(), firstOrderDate);

        this.investments = [];
        this.performanceDataItems = [];
        this.performanceDataItemsInPercentage = [];

        for (const {
          date,
          netPerformanceInPercentage,
          totalInvestment,
          value
        } of chart) {
          this.investments.push({ date, investment: totalInvestment });
          this.performanceDataItems.push({
            date,
            value
          });
          this.performanceDataItemsInPercentage.push({
            date,
            value: netPerformanceInPercentage
          });
        }

        this.updateBenchmarkDataItems();

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchInvestments({
        groupBy: 'month',
        range: this.user?.settings?.dateRange
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ investments }) => {
        this.investmentsByMonth = investments;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPositions({ range: this.user?.settings?.dateRange })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ positions }) => {
        const positionsSorted = sortBy(
          positions,
          'netPerformancePercentage'
        ).reverse();

        this.top3 = positionsSorted.slice(0, 3);

        if (positions?.length > 3) {
          this.bottom3 = positionsSorted.slice(-3).reverse();
        } else {
          this.bottom3 = [];
        }

        this.changeDetectorRef.markForCheck();
      });

    this.changeDetectorRef.markForCheck();
  }

  private updateBenchmarkDataItems() {
    if (this.user.settings.benchmark) {
      const { dataSource, symbol } =
        this.benchmarks.find(({ id }) => {
          return id === this.user.settings.benchmark;
        }) ?? {};

      this.dataService
        .fetchBenchmarkBySymbol({
          dataSource,
          symbol,
          startDate: this.firstOrderDate
        })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ marketData }) => {
          this.benchmarkDataItems = marketData.map(({ date, value }) => {
            return {
              date,
              value
            };
          });

          this.isLoadingBenchmarkComparator = false;

          this.changeDetectorRef.markForCheck();
        });
    } else {
      this.benchmarkDataItems = [];

      this.isLoadingBenchmarkComparator = false;
    }
  }
}
