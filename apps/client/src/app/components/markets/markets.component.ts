import { GfFearAndGreedIndexModule } from '@ghostfolio/client/components/fear-and-greed-index/fear-and-greed-index.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { resetHours } from '@ghostfolio/common/helper';
import {
  Benchmark,
  HistoricalDataItem,
  MarketDataOfMarketsResponse,
  ToggleOption,
  User
} from '@ghostfolio/common/interfaces';
import { FearAndGreedIndexMode } from '@ghostfolio/common/types';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfBenchmarkComponent,
    GfFearAndGreedIndexModule,
    GfLineChartComponent,
    GfToggleModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-markets',
  styleUrls: ['./markets.scss'],
  templateUrl: './markets.html'
})
export class MarketsComponent implements OnDestroy, OnInit {
  public benchmarks: Benchmark[];
  public deviceType: string;
  public fearAndGreedIndex: number;
  public fearAndGreedIndexData: MarketDataOfMarketsResponse['fearAndGreedIndex'];
  public fearLabel = $localize`Fear`;
  public greedLabel = $localize`Greed`;
  public historicalDataItems: HistoricalDataItem[];
  public fearAndGreedIndexMode: FearAndGreedIndexMode = 'STOCKS';
  public fearAndGreedIndexModeOptions: ToggleOption[] = [
    { label: $localize`Stocks`, value: 'STOCKS' },
    { label: $localize`Cryptocurrencies`, value: 'CRYPTOCURRENCIES' }
  ];
  public readonly numberOfDays = 365;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private userService: UserService
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.dataService
      .fetchMarketDataOfMarkets({ includeHistoricalData: this.numberOfDays })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ fearAndGreedIndex }) => {
        this.fearAndGreedIndexData = fearAndGreedIndex;

        this.initialize();

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchBenchmarks()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ benchmarks }) => {
        this.benchmarks = benchmarks;

        this.changeDetectorRef.markForCheck();
      });
  }

  public initialize() {
    this.fearAndGreedIndex =
      this.fearAndGreedIndexData[this.fearAndGreedIndexMode].marketPrice;

    this.historicalDataItems = [
      ...this.fearAndGreedIndexData[this.fearAndGreedIndexMode].historicalData,
      {
        date: resetHours(new Date()).toISOString(),
        value: this.fearAndGreedIndex
      }
    ];
  }

  public onChangeFearAndGreedIndexMode(
    aFearAndGreedIndexMode: FearAndGreedIndexMode
  ) {
    this.fearAndGreedIndexMode = aFearAndGreedIndexMode;

    this.initialize();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
