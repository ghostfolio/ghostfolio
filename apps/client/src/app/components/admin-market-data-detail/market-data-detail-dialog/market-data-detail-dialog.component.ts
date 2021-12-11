import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { MarketData } from '@prisma/client';
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
    this.dialogRef.close();
  }

  public onGatherData() {
    this.adminService
      .gatherSymbol({
        dataSource: this.data.dataSource,
        date: this.data.date,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((marketData: MarketData) => {
        this.data.marketPrice = marketData.marketPrice;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
