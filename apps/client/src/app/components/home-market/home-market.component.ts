import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { ghostfolioFearAndGreedIndexSymbol } from '@ghostfolio/common/config';
import { resetHours } from '@ghostfolio/common/helper';
import {
  Benchmark,
  HistoricalDataItem,
  InfoItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-home-market',
  styleUrls: ['./home-market.scss'],
  templateUrl: './home-market.html'
})
export class HomeMarketComponent implements OnDestroy{
  public benchmarks: Benchmark[];
  public deviceType: string;
  public fearAndGreedIndex: number;
  public fearLabel = $localize`Fear`;
  public greedLabel = $localize`Greed`;
  public hasPermissionToAccessFearAndGreedIndex: boolean;
  public historicalDataItems: HistoricalDataItem[];
  public info: InfoItem;
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
    this.info = this.dataService.fetchInfo();

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
    this.hasPermissionToAccessFearAndGreedIndex = hasPermission(
      this.info?.globalPermissions,
      permissions.enableFearAndGreedIndex
    );

    if (this.hasPermissionToAccessFearAndGreedIndex) {
      this.dataService
        .fetchSymbolItem({
          dataSource: this.info.fearAndGreedDataSource,
          includeHistoricalData: this.numberOfDays,
          symbol: ghostfolioFearAndGreedIndexSymbol
        })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ historicalData, marketPrice }) => {
          this.fearAndGreedIndex = marketPrice;
          this.historicalDataItems = [
            ...historicalData,
            {
              date: resetHours(new Date()).toISOString(),
              value: marketPrice
            }
          ];

          this.changeDetectorRef.markForCheck();
        });
    }

    this.dataService
      .fetchBenchmarks()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ benchmarks }) => {
        this.benchmarks = benchmarks;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
