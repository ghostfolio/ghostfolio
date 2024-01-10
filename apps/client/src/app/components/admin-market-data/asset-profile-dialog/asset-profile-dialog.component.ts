import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UpdateAssetProfileDto } from '@ghostfolio/api/app/admin/update-asset-profile.dto';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  Currency,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';
import {
  AssetClass,
  AssetSubClass,
  MarketData,
  SymbolProfile
} from '@prisma/client';
import { format } from 'date-fns';
import { parse as csvToJson } from 'papaparse';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { AssetProfileDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-asset-profile-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'asset-profile-dialog.html',
  styleUrls: ['./asset-profile-dialog.component.scss']
})
export class AssetProfileDialog implements OnDestroy, OnInit {
  public assetProfileClass: string;
  public assetClasses = Object.keys(AssetClass).map((assetClass) => {
    return { id: assetClass, label: translate(assetClass) };
  });
  public assetSubClasses = Object.keys(AssetSubClass).map((assetSubClass) => {
    return { id: assetSubClass, label: translate(assetSubClass) };
  });
  public assetProfile: AdminMarketDataDetails['assetProfile'];
  public assetProfileForm = this.formBuilder.group({
    assetClass: new FormControl<AssetClass>(undefined),
    assetSubClass: new FormControl<AssetSubClass>(undefined),
    comment: '',
    currency: '',
    historicalData: this.formBuilder.group({
      csvString: ''
    }),
    name: ['', Validators.required],
    scraperConfiguration: '',
    symbolMapping: '',
    countries: '',
    sectors: ''
  });
  public assetProfileSubClass: string;
  public benchmarks: Partial<SymbolProfile>[];
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public currencies: Currency[] = [];
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
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit(): void {
    const { benchmarks, currencies } = this.dataService.fetchInfo();

    this.benchmarks = benchmarks;
    this.currencies = currencies.map((currency) => ({
      label: currency,
      value: currency
    }));

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

        this.assetProfileClass = translate(this.assetProfile?.assetClass);
        this.assetProfileSubClass = translate(this.assetProfile?.assetSubClass);
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
          assetClass: this.assetProfile.assetClass ?? null,
          assetSubClass: this.assetProfile.assetSubClass ?? null,
          comment: this.assetProfile?.comment ?? '',
          currency: this.assetProfile?.currency,
          historicalData: {
            csvString: AssetProfileDialog.HISTORICAL_DATA_TEMPLATE
          },
          name: this.assetProfile.name ?? this.assetProfile.symbol,
          scraperConfiguration: JSON.stringify(
            this.assetProfile?.scraperConfiguration ?? {}
          ),
          symbolMapping: JSON.stringify(this.assetProfile?.symbolMapping ?? {}),
          countries: JSON.stringify(
            assetProfile.countries.map((e) => {
              return { code: e.code, weight: e.weight };
            }) ?? []
          ),
          sectors: JSON.stringify(assetProfile.sectors ?? [])
        });
        console.log(this.assetProfileForm.value);

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
    try {
      const marketData = csvToJson(
        this.assetProfileForm.controls['historicalData'].controls['csvString']
          .value,
        {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true
        }
      ).data;

      this.adminService
        .postMarketData({
          dataSource: this.data.dataSource,
          marketData: {
            marketData: marketData.map(({ date, marketPrice }) => {
              return { marketPrice, date: parseDate(date).toISOString() };
            })
          },
          symbol: this.data.symbol
        })
        .pipe(
          catchError(({ error, message }) => {
            this.snackBar.open(`${error}: ${message[0]}`, undefined, {
              duration: 3000
            });
            return EMPTY;
          }),
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe(() => {
          this.initialize();
        });
    } catch {
      this.snackBar.open(
        $localize`Oops! Could not parse historical data.`,
        undefined,
        { duration: 3000 }
      );
    }
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
    let countries = [];

    let sectors = [];

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

    try {
      countries = JSON.parse(this.assetProfileForm.controls['countries'].value);
    } catch {}

    try {
      sectors = JSON.parse(this.assetProfileForm.controls['sectors'].value);
    } catch {}

    const assetProfileData: UpdateAssetProfileDto = {
      scraperConfiguration,
      symbolMapping,
      assetClass: this.assetProfileForm.controls['assetClass'].value,
      assetSubClass: this.assetProfileForm.controls['assetSubClass'].value,
      comment: this.assetProfileForm.controls['comment'].value ?? null,
      currency: (<Currency>(
        (<unknown>this.assetProfileForm.controls['currency'].value)
      ))?.value,
      name: this.assetProfileForm.controls['name'].value,
      countries,
      sectors
    };
    console.log(assetProfileData);

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

  public onTestMarketData() {
    this.adminService
      .testMarketData({
        dataSource: this.data.dataSource,
        scraperConfiguration:
          this.assetProfileForm.controls['scraperConfiguration'].value,
        symbol: this.data.symbol
      })
      .pipe(
        catchError(({ error }) => {
          alert(`Error: ${error?.message}`);
          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(({ price }) => {
        alert(
          $localize`The current market price is` +
            ' ' +
            price +
            ' ' +
            (<Currency>(
              (<unknown>this.assetProfileForm.controls['currency'].value)
            ))?.value
        );
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
