import { AdminService } from '@ghostfolio/client/services/admin.service';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { MarketDataDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-market-data-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./market-data-detail-dialog.scss'],
  templateUrl: 'market-data-detail-dialog.html'
})
export class MarketDataDetailDialog implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: MarketDataDetailDialogParams,
    private dateAdapter: DateAdapter<any>,
    public dialogRef: MatDialogRef<MarketDataDetailDialog>,
    @Inject(MAT_DATE_LOCALE) private locale: string
  ) {}

  public ngOnInit() {
    this.locale = this.data.user?.settings?.locale;
    this.dateAdapter.setLocale(this.locale);
  }

  public onCancel() {
    this.dialogRef.close({ withRefresh: false });
  }

  public onFetchSymbolForDate() {
    this.adminService
      .fetchSymbolForDate({
        dataSource: this.data.dataSource,
        dateString: this.data.dateString,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ marketPrice }) => {
        this.data.marketPrice = marketPrice;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onUpdate() {
    this.adminService
      .postMarketData({
        dataSource: this.data.dataSource,
        marketData: {
          marketData: [
            {
              date: this.data.dateString,
              marketPrice: this.data.marketPrice
            }
          ]
        },
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dialogRef.close({ withRefresh: true });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
