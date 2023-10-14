import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UpdateAssetProfileDto } from '@ghostfolio/api/app/admin/update-asset-profile.dto';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';
import { MarketData, SymbolProfile } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { parse as csvToJson } from 'papaparse';
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
  public assetClass: string;
  public assetProfile: AdminMarketDataDetails['assetProfile'];
  public assetProfileForm = this.formBuilder.group({
    comment: '',
    scraperConfiguration: '',
    symbolMapping: ''
  });
  public assetSubClass: string;
  public benchmarks: Partial<SymbolProfile>[];
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public historicalDataAsCsvString =
    AssetProfileDialog.HISTORICAL_DATA_TEMPLATE;
  public isBenchmark = false;
  public marketDataDetails: MarketData[] = [];
  public sectors: {
    [name: string]: { name: string; value: number };
  };

  private static readonly HISTORICAL_DATA_TEMPLATE = `date;marketPrice\n${format(
    new Date(),
    DATE_FORMAT
  )};123.45`;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AssetProfileDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<AssetProfileDialog>,
    private formBuilder: FormBuilder
  ) {}

  public ngOnInit(): void {
    this.benchmarks = this.dataService.fetchInfo().benchmarks;

    this.initialize();
  }

  public initialize() {
    this.adminService
      .fetchAdminMarketDataBySymbol({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ assetProfile, marketData }) => {
        this.assetProfile = assetProfile;

        this.assetClass = translate(this.assetProfile?.assetClass);
        this.assetSubClass = translate(this.assetProfile?.assetSubClass);
        this.countries = {};
        this.isBenchmark = this.benchmarks.some(({ id }) => {
          return id === this.assetProfile.id;
        });
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

        this.assetProfileForm.setValue({
          comment: this.assetProfile?.comment ?? '',
          scraperConfiguration: JSON.stringify(
            this.assetProfile?.scraperConfiguration ?? {}
          ),
          symbolMapping: JSON.stringify(this.assetProfile?.symbolMapping ?? {})
        });

        this.assetProfileForm.markAsPristine();

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClose(): void {
    this.dialogRef.close();
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

  public onImportHistoricalData() {
    const marketData = csvToJson(this.historicalDataAsCsvString, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true
    }).data;

    this.adminService
      .postMarketData({
        dataSource: this.data.dataSource,
        marketData: {
          marketData: marketData.map(({ date, marketPrice }) => {
            return { marketPrice, date: parseISO(date) };
          })
        },
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initialize();
      });

    this.historicalDataAsCsvString =
      AssetProfileDialog.HISTORICAL_DATA_TEMPLATE;
  }

  public onMarketDataChanged(withRefresh: boolean = false) {
    if (withRefresh) {
      this.initialize();
    }
  }

  public onSetBenchmark({ dataSource, symbol }: UniqueAsset) {
    this.dataService
      .postBenchmark({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.updateInfo();

        this.isBenchmark = true;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onSubmit() {
    let scraperConfiguration = {};
    let symbolMapping = {};

    try {
      scraperConfiguration = JSON.parse(
        this.assetProfileForm.controls['scraperConfiguration'].value
      );
    } catch {}

    try {
      symbolMapping = JSON.parse(
        this.assetProfileForm.controls['symbolMapping'].value
      );
    } catch {}

    const assetProfileData: UpdateAssetProfileDto = {
      scraperConfiguration,
      symbolMapping,
      comment: this.assetProfileForm.controls['comment'].value ?? null
    };

    this.adminService
      .patchAssetProfile({
        ...assetProfileData,
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .subscribe(() => {
        this.initialize();
      });
  }

  public onUnsetBenchmark({ dataSource, symbol }: UniqueAsset) {
    this.dataService
      .deleteBenchmark({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.updateInfo();

        this.isBenchmark = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
