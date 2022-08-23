import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { MarketData } from '@prisma/client';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AssetProfileDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-asset-profile-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'asset-profile-dialog.html',
  styleUrls: ['./asset-profile-dialog.component.scss']
})
export class AssetProfileDialog implements OnDestroy, OnInit {
  public marketDataDetails: MarketData[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    public dialogRef: MatDialogRef<AssetProfileDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AssetProfileDialogParams
  ) {}

  public ngOnInit(): void {
    this.initialize();
  }

  public onClose(): void {
    this.dialogRef.close();
  }

  public onMarketDataChanged(withRefresh: boolean = false) {
    if (withRefresh) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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

  private initialize() {
    this.fetchAdminMarketDataBySymbol({
      dataSource: this.data.dataSource,
      symbol: this.data.symbol
    });
  }
}
