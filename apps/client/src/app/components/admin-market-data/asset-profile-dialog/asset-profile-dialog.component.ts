import { UpdateAssetProfileDto } from '@ghostfolio/api/app/admin/update-asset-profile.dto';
import { AdminMarketDataService } from '@ghostfolio/client/components/admin-market-data/admin-market-data.service';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';
import { ghostfolioScraperApiSymbolPrefix } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  AssetProfileIdentifier,
  LineChartItem,
  User
} from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  signal
} from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  AssetClass,
  AssetSubClass,
  MarketData,
  SymbolProfile,
  Tag
} from '@prisma/client';
import { format } from 'date-fns';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { AssetProfileDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-asset-profile-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'asset-profile-dialog.html',
  styleUrls: ['./asset-profile-dialog.component.scss'],
  standalone: false
})
export class AssetProfileDialog implements OnDestroy, OnInit {
  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;
  public separatorKeysCodes: number[] = [ENTER, COMMA];
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
    countries: '',
    currency: '',
    historicalData: this.formBuilder.group({
      csvString: ''
    }),
    name: ['', Validators.required],
    tags: new FormControl<Tag[]>(undefined),
    tagsDisconnected: new FormControl<Tag[]>(undefined),
    scraperConfiguration: this.formBuilder.group({
      defaultMarketPrice: null,
      headers: JSON.stringify({}),
      locale: '',
      mode: '',
      selector: '',
      url: ''
    }),
    sectors: '',
    symbolMapping: '',
    url: ''
  });
  public assetProfileSubClass: string;
  public benchmarks: Partial<SymbolProfile>[];
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public currencies: string[] = [];
  public ghostfolioScraperApiSymbolPrefix = ghostfolioScraperApiSymbolPrefix;
  public historicalDataItems: LineChartItem[];
  public isBenchmark = false;
  public marketDataItems: MarketData[] = [];
  public modeValues = [
    {
      value: 'lazy',
      viewValue: $localize`Lazy` + ' (' + $localize`end of day` + ')'
    },
    {
      value: 'instant',
      viewValue: $localize`Instant` + ' (' + $localize`real-time` + ')'
    }
  ];
  public scraperConfiguationIsExpanded = signal(false);
  public sectors: {
    [name: string]: { name: string; value: number };
  };

  public HoldingTags: { id: string; name: string; userId: string }[];
  public user: User;

  private static readonly HISTORICAL_DATA_TEMPLATE = `date;marketPrice\n${format(
    new Date(),
    DATE_FORMAT
  )};123.45`;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public adminMarketDataService: AdminMarketDataService,
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AssetProfileDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<AssetProfileDialog>,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    const { benchmarks, currencies } = this.dataService.fetchInfo();

    this.benchmarks = benchmarks;
    this.currencies = currencies;

    this.initialize();
  }

  public initialize() {
    this.adminService
      .fetchTags()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((tags) => {
        this.HoldingTags = tags.map(({ id, name, userId }) => {
          return { id, name, userId };
        });
        this.dataService.updateInfo();

        this.changeDetectorRef.markForCheck();
      });

    this.historicalDataItems = undefined;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });

    this.dataService
      .fetchMarketDataBySymbol({
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

        this.historicalDataItems = marketData.map(({ date, marketPrice }) => {
          return {
            date: format(date, DATE_FORMAT),
            value: marketPrice
          };
        });

        this.marketDataItems = marketData;
        this.sectors = {};

        if (this.assetProfile?.countries?.length > 0) {
          for (const { code, name, weight } of this.assetProfile.countries) {
            this.countries[code] = {
              name,
              value: weight
            };
          }
        }

        if (this.assetProfile?.sectors?.length > 0) {
          for (const { name, weight } of this.assetProfile.sectors) {
            this.sectors[name] = {
              name,
              value: weight
            };
          }
        }

        this.assetProfileForm.setValue({
          assetClass: this.assetProfile.assetClass ?? null,
          assetSubClass: this.assetProfile.assetSubClass ?? null,
          comment: this.assetProfile?.comment ?? '',
          tags: this.assetProfile?.tags ?? [],
          tagsDisconnected: [],
          countries: JSON.stringify(
            this.assetProfile?.countries?.map(({ code, weight }) => {
              return { code, weight };
            }) ?? []
          ),
          currency: this.assetProfile?.currency,
          historicalData: {
            csvString: AssetProfileDialog.HISTORICAL_DATA_TEMPLATE
          },
          name: this.assetProfile.name ?? this.assetProfile.symbol,
          scraperConfiguration: {
            defaultMarketPrice:
              this.assetProfile?.scraperConfiguration?.defaultMarketPrice ??
              null,
            headers: JSON.stringify(
              this.assetProfile?.scraperConfiguration?.headers ?? {}
            ),
            locale: this.assetProfile?.scraperConfiguration?.locale ?? '',
            mode: this.assetProfile?.scraperConfiguration?.mode ?? 'lazy',
            selector: this.assetProfile?.scraperConfiguration?.selector ?? '',
            url: this.assetProfile?.scraperConfiguration?.url ?? ''
          },
          sectors: JSON.stringify(this.assetProfile?.sectors ?? []),
          symbolMapping: JSON.stringify(this.assetProfile?.symbolMapping ?? {}),
          url: this.assetProfile?.url
        });

        this.assetProfileForm.markAsPristine();

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onDeleteProfileData({ dataSource, symbol }: AssetProfileIdentifier) {
    this.adminMarketDataService.deleteAssetProfile({ dataSource, symbol });

    this.dialogRef.close();
  }

  public onGatherProfileDataBySymbol({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.adminService
      .gatherProfileDataBySymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onGatherSymbol({ dataSource, symbol }: AssetProfileIdentifier) {
    this.adminService
      .gatherSymbol({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onGatherSymbolMissingOnly({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.adminService
      .gatherSymbolMissingOnly({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe();
  }

  public onMarketDataChanged(withRefresh: boolean = false) {
    if (withRefresh) {
      this.initialize();
    }
  }

  public onSetBenchmark({ dataSource, symbol }: AssetProfileIdentifier) {
    this.dataService
      .postBenchmark({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.updateInfo();

        this.isBenchmark = true;

        this.changeDetectorRef.markForCheck();
      });
  }

  public async onSubmit() {
    let countries = [];
    let scraperConfiguration = {};
    let sectors = [];
    let symbolMapping = {};

    try {
      countries = JSON.parse(this.assetProfileForm.get('countries').value);
    } catch {}

    try {
      scraperConfiguration = {
        defaultMarketPrice:
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'defaultMarketPrice'
          ].value,
        headers: JSON.parse(
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'headers'
          ].value
        ),
        locale:
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'locale'
          ].value,
        mode: this.assetProfileForm.controls['scraperConfiguration'].controls[
          'mode'
        ].value,
        selector:
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'selector'
          ].value,
        url: this.assetProfileForm.controls['scraperConfiguration'].controls[
          'url'
        ].value
      };
    } catch {}

    try {
      sectors = JSON.parse(this.assetProfileForm.get('sectors').value);
    } catch {}

    try {
      symbolMapping = JSON.parse(
        this.assetProfileForm.get('symbolMapping').value
      );
    } catch {}

    const assetProfileData: UpdateAssetProfileDto = {
      countries,
      scraperConfiguration,
      sectors,
      symbolMapping,
      assetClass: this.assetProfileForm.get('assetClass').value,
      assetSubClass: this.assetProfileForm.get('assetSubClass').value,
      comment: this.assetProfileForm.get('comment').value || null,
      tags: this.assetProfileForm.get('tags').value,
      tagsDisconnected: this.assetProfileForm.get('tagsDisconnected').value,
      currency: this.assetProfileForm.get('currency').value,
      name: this.assetProfileForm.get('name').value,
      url: this.assetProfileForm.get('url').value
    };

    try {
      await validateObjectForForm({
        classDto: UpdateAssetProfileDto,
        form: this.assetProfileForm,
        object: assetProfileData
      });
    } catch (error) {
      console.error(error);
      return;
    }

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
        scraperConfiguration: JSON.stringify({
          defaultMarketPrice:
            this.assetProfileForm.controls['scraperConfiguration'].controls[
              'defaultMarketPrice'
            ].value,
          headers: JSON.parse(
            this.assetProfileForm.controls['scraperConfiguration'].controls[
              'headers'
            ].value
          ),
          locale:
            this.assetProfileForm.controls['scraperConfiguration'].controls[
              'locale'
            ].value,
          mode: this.assetProfileForm.controls['scraperConfiguration'].controls[
            'mode'
          ].value,
          selector:
            this.assetProfileForm.controls['scraperConfiguration'].controls[
              'selector'
            ].value,
          url: this.assetProfileForm.controls['scraperConfiguration'].controls[
            'url'
          ].value
        }),
        symbol: this.data.symbol
      })
      .pipe(
        catchError(({ error }) => {
          this.notificationService.alert({
            message: error?.message,
            title: $localize`Error`
          });
          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(({ price }) => {
        this.notificationService.alert({
          title:
            $localize`The current market price is` +
            ' ' +
            price +
            ' ' +
            this.assetProfileForm.get('currency').value
        });
      });
  }

  public onUnsetBenchmark({ dataSource, symbol }: AssetProfileIdentifier) {
    this.dataService
      .deleteBenchmark({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.updateInfo();

        this.isBenchmark = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onRemoveTag(aTag: Tag) {
    this.assetProfileForm.controls['tags'].setValue(
      this.assetProfileForm.controls['tags'].value.filter(({ id }) => {
        return id !== aTag.id;
      })
    );
    this.assetProfileForm.controls['tagsDisconnected'].setValue([
      ...(this.assetProfileForm.controls['tagsDisconnected'].value ?? []),
      aTag
    ]);
    this.assetProfileForm.markAsDirty();
  }

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    this.assetProfileForm.controls['tags'].setValue([
      ...(this.assetProfileForm.controls['tags'].value ?? []),
      this.HoldingTags.find(({ id }) => {
        return id === event.option.value;
      })
    ]);
    this.tagInput.nativeElement.value = '';
    this.assetProfileForm.markAsDirty();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
