import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { AdminMarketDataItem } from '@ghostfolio/common/interfaces/admin-market-data.interface';
import { MarketData } from '@prisma/client';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-market-data',
  styleUrls: ['./admin-market-data.scss'],
  templateUrl: './admin-market-data.html'
})
export class AdminMarketDataComponent implements OnDestroy, OnInit {
  public currentSymbol: string;
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public marketData: AdminMarketDataItem[] = [];
  public marketDataDetails: MarketData[] = [];

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.fetchAdminMarketData();
  }

  public setCurrentSymbol(aSymbol: string) {
    this.marketDataDetails = [];

    if (this.currentSymbol === aSymbol) {
      this.currentSymbol = '';
    } else {
      this.currentSymbol = aSymbol;

      this.fetchAdminMarketDataBySymbol(this.currentSymbol);
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

  private fetchAdminMarketDataBySymbol(aSymbol: string) {
    this.dataService
      .fetchAdminMarketDataBySymbol(aSymbol)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ marketData }) => {
        this.marketDataDetails = marketData;

        this.changeDetectorRef.markForCheck();
      });
  }
}
