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
import {
  EnhancedSymbolProfile,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
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
  public assetProfile: EnhancedSymbolProfile;
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public marketDataDetails: MarketData[] = [];
  public sectors: {
    [name: string]: { name: string; value: number };
  };

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
      .subscribe(({ assetProfile, marketData }) => {
        this.assetProfile = assetProfile;
        this.countries = {};
        this.marketDataDetails = marketData;
        this.sectors = {};

        if (assetProfile?.countries?.length > 0) {
          for (const country of assetProfile.countries) {
            this.countries[country.code] = {
              name: country.name,
              value: country.weight
            };
          }
        }

        if (assetProfile?.sectors?.length > 0) {
          for (const sector of assetProfile.sectors) {
            this.sectors[sector.name] = {
              name: sector.name,
              value: sector.weight
            };
          }
        }

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
