import { UserService } from '@ghostfolio/client/services/user/user.service';
import { resetHours } from '@ghostfolio/common/helper';
import {
  Benchmark,
  HistoricalDataItem,
  InfoItem,
  MarketDataOfMarketsResponse,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { FearAndGreedIndexMode, ToggleOption } from '@ghostfolio/common/types';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfFearAndGreedIndexComponent } from '@ghostfolio/ui/fear-and-greed-index';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { DataService } from '@ghostfolio/ui/services';
import { GfToggleComponent } from '@ghostfolio/ui/toggle';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfBenchmarkComponent,
    GfFearAndGreedIndexComponent,
    GfLineChartComponent,
    GfToggleComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-markets',
  styleUrls: ['./markets.scss'],
  templateUrl: './markets.html'
})
export class GfMarketsComponent implements OnInit {
  protected readonly benchmarks = signal<Benchmark[]>([]);

  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  protected readonly fearAndGreedIndexModeOptions: ToggleOption[] = [
    { label: $localize`Stocks`, value: 'STOCKS' },
    { label: $localize`Cryptocurrencies`, value: 'CRYPTOCURRENCIES' }
  ];

  protected readonly fearLabel = $localize`Fear`;
  protected readonly greedLabel = $localize`Greed`;
  protected readonly numberOfDays = 365;

  protected fearAndGreedIndex: number | undefined;
  protected fearAndGreedIndexMode: FearAndGreedIndexMode = 'STOCKS';
  protected hasPermissionToAccessFearAndGreedIndex: boolean;
  protected hasPermissionToReadMarketDataOfMarkets: boolean;
  protected historicalDataItems: HistoricalDataItem[];
  protected isLoadingFearAndGreedIndex = true;
  protected user: User;

  private fearAndGreedIndexData: MarketDataOfMarketsResponse['fearAndGreedIndex'];

  private readonly info: InfoItem;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.info = this.dataService.fetchInfo();

    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );

    if (this.hasPermissionToAccessFearAndGreedIndex) {
      this.fearAndGreedIndex = this.info.fearAndGreedStocksMarketPrice;
    }

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToReadMarketDataOfMarkets = hasPermission(
            this.user.permissions,
            permissions.readMarketDataOfMarkets
          );

          if (
            this.hasPermissionToReadMarketDataOfMarkets &&
            !this.fearAndGreedIndexData
          ) {
            this.fetchMarketDataOfMarkets();
          } else {
            this.isLoadingFearAndGreedIndex = false;
          }

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.dataService
      .fetchBenchmarks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ benchmarks }) => {
        this.benchmarks.set(benchmarks);
      });
  }

  protected onChangeFearAndGreedIndexMode(
    aFearAndGreedIndexMode: FearAndGreedIndexMode
  ) {
    this.fearAndGreedIndexMode = aFearAndGreedIndexMode;

    this.initializeFearAndGreedIndex();
  }

  private fetchMarketDataOfMarkets() {
    this.dataService
      .fetchMarketDataOfMarkets({ includeHistoricalData: this.numberOfDays })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ fearAndGreedIndex }) => {
        this.fearAndGreedIndexData = fearAndGreedIndex;

        this.initializeFearAndGreedIndex();

        this.isLoadingFearAndGreedIndex = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private initializeFearAndGreedIndex() {
    this.fearAndGreedIndex =
      this.fearAndGreedIndexData[this.fearAndGreedIndexMode]?.marketPrice;

    this.historicalDataItems = [
      ...(this.fearAndGreedIndexData[this.fearAndGreedIndexMode]
        ?.historicalData ?? []),
      {
        date: resetHours(new Date()).toISOString(),
        value: this.fearAndGreedIndex
      }
    ];
  }
}
