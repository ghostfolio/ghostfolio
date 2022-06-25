import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { UniqueAsset, User } from '@ghostfolio/common/interfaces';
import { AdminMarketDataItem } from '@ghostfolio/common/interfaces/admin-market-data.interface';
import { DataSource, MarketData } from '@prisma/client';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-market-data',
  styleUrls: ['./admin-market-data.scss'],
  templateUrl: './admin-market-data.html'
})
export class AdminMarketDataComponent implements OnDestroy, OnInit {
  public currentDataSource: DataSource;
  public currentSymbol: string;
  public defaultDateFormat: string;
  public marketData: AdminMarketDataItem[] = [];
  public marketDataDetails: MarketData[] = [];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );
        }
      });
  }

  public ngOnInit() {
    this.fetchAdminMarketData();
  }

  public onDeleteProfileData({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .deleteProfileData({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public onGatherProfileDataBySymbol({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .gatherProfileDataBySymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public onGatherSymbol({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .gatherSymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {});
  }

  public onMarketDataChanged(withRefresh: boolean = false) {
    if (withRefresh) {
      this.fetchAdminMarketData();
      this.fetchAdminMarketDataBySymbol({
        dataSource: this.currentDataSource,
        symbol: this.currentSymbol
      });
    }
  }

  public setCurrentProfile({ dataSource, symbol }: UniqueAsset) {
    this.marketDataDetails = [];

    if (this.currentSymbol === symbol) {
      this.currentDataSource = undefined;
      this.currentSymbol = '';
    } else {
      this.currentDataSource = dataSource;
      this.currentSymbol = symbol;

      this.fetchAdminMarketDataBySymbol({ dataSource, symbol });
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchAdminMarketData() {
    this.dataService
      .fetchAdminMarketData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ marketData }) => {
        this.marketData = marketData;

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchAdminMarketDataBySymbol({ dataSource, symbol }: UniqueAsset) {
    this.adminService
      .fetchAdminMarketDataBySymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ marketData }) => {
        this.marketDataDetails = marketData;

        this.changeDetectorRef.markForCheck();
      });
  }
}
