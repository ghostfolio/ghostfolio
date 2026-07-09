import { GfFearAndGreedIndexComponent } from '@ghostfolio/client/components/fear-and-greed-index/fear-and-greed-index.component';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { ghostfolioFearAndGreedIndexSymbolStocks } from '@ghostfolio/common/config';
import { resetHours } from '@ghostfolio/common/helper';
import {
  Benchmark,
  HistoricalDataItem,
  InfoItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { DataService } from '@ghostfolio/ui/services';

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
    GfLineChartComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-market',
  styleUrls: ['./home-market.scss'],
  templateUrl: './home-market.html'
})
export class GfHomeMarketComponent implements OnInit {
  protected readonly benchmarks = signal<Benchmark[]>([]);
  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  protected readonly fearAndGreedIndex = signal<number | undefined>(undefined);
  protected readonly fearLabel = $localize`Fear`;
  protected readonly greedLabel = $localize`Greed`;
  protected hasPermissionToAccessFearAndGreedIndex: boolean;
  protected readonly historicalDataItems = signal<HistoricalDataItem[]>([]);
  protected readonly numberOfDays = 365;
  protected user: User;

  private readonly info: InfoItem;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.info = this.dataService.fetchInfo();

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );

    if (
      this.hasPermissionToAccessFearAndGreedIndex &&
      this.info.fearAndGreedDataSource
    ) {
      this.dataService
        .fetchSymbolItem({
          dataSource: this.info.fearAndGreedDataSource,
          includeHistoricalData: this.numberOfDays,
          symbol: ghostfolioFearAndGreedIndexSymbolStocks
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(({ historicalData, marketPrice }) => {
          this.fearAndGreedIndex.set(marketPrice);
          this.historicalDataItems.set([
            ...historicalData,
            {
              date: resetHours(new Date()).toISOString(),
              value: marketPrice
            }
          ]);
        });
    }

    this.dataService
      .fetchBenchmarks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ benchmarks }) => {
        this.benchmarks.set(benchmarks);
      });
  }
}
