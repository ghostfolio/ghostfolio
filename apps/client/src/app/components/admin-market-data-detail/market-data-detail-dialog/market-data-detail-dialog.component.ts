import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '@ghostfolio/client/services/admin.service';
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
    public dialogRef: MatDialogRef<MarketDataDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MarketDataDetailDialogParams
  ) {}

  public ngOnInit() {}

  public onCancel(): void {
    this.dialogRef.close({ withRefresh: false });
  }

  public onFetchSymbolForDate() {
    this.adminService
      .fetchSymbolForDate({
        dataSource: this.data.dataSource,
        date: this.data.date,
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
      .putMarketData({
        dataSource: this.data.dataSource,
        date: this.data.date,
        marketData: { marketPrice: this.data.marketPrice },
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
