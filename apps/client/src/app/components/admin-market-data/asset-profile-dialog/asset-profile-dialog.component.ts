import { UpdateAssetProfileDto } from '@ghostfolio/api/app/admin/update-asset-profile.dto';
import { AdminMarketDataService } from '@ghostfolio/client/components/admin-market-data/admin-market-data.service';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';
import {
  ASSET_CLASS_MAPPING,
  ghostfolioScraperApiSymbolPrefix,
  PROPERTY_IS_DATA_GATHERING_ENABLED
} from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  AssetProfileIdentifier,
  LineChartItem,
  ScraperConfiguration,
  User
} from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

import { HttpErrorResponse } from '@angular/common/http';
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
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AssetClass,
  AssetSubClass,
  MarketData,
  Prisma,
  SymbolProfile
} from '@prisma/client';
import { format } from 'date-fns';
import { StatusCodes } from 'http-status-codes';
import { addIcons } from 'ionicons';
import { createOutline, ellipsisVertical } from 'ionicons/icons';
import ms from 'ms';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import {
  AssetProfileDialogParams,
  SelectOption
} from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-asset-profile-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'asset-profile-dialog.html',
  styleUrls: ['./asset-profile-dialog.component.scss'],
  standalone: false
})
export class AssetProfileDialog implements OnDestroy, OnInit {
  private static readonly HISTORICAL_DATA_TEMPLATE = `date;marketPrice\n${format(
    new Date(),
    DATE_FORMAT
  )};123.45`;

  @ViewChild('assetProfileFormElement')
  assetProfileFormElement: ElementRef<HTMLFormElement>;

  public assetProfileClass: string;
  public assetProfileSubClass: string;

  public assetClasses = Object.keys(AssetClass).map((id) => {
    return { id, label: translate(id) } as SelectOption;
  });
  public assetSubClasses: SelectOption[] = [];

  public assetProfile: AdminMarketDataDetails['assetProfile'];

  public assetClassControl = new FormControl<AssetClass>(undefined);
  public assetSubClassControl = new FormControl<AssetSubClass>(undefined);
  public assetProfileForm = this.formBuilder.group({
    assetClass: this.assetClassControl,
    assetSubClass: this.assetSubClassControl,
    comment: '',
    countries: '',
    currency: '',
    historicalData: this.formBuilder.group({
      csvString: ''
    }),
    isActive: [true],
    name: ['', Validators.required],
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

  public assetProfileIdentifierForm = this.formBuilder.group(
    {
      assetProfileIdentifier: new FormControl<AssetProfileIdentifier>(
        { symbol: null, dataSource: null },
        [Validators.required]
      )
    },
    {
      validators: (control) => {
        return this.isNewSymbolValid(control);
      }
    }
  );

  public benchmarks: Partial<SymbolProfile>[];

  public countries: {
    [code: string]: { name: string; value: number };
  };

  public currencies: string[] = [];
  public ghostfolioScraperApiSymbolPrefix = ghostfolioScraperApiSymbolPrefix;
  public historicalDataItems: LineChartItem[];
  public isBenchmark = false;
  public isDataGatheringEnabled: boolean;
  public isEditAssetProfileIdentifierMode = false;
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

  public user: User;

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
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {
    addIcons({ createOutline, ellipsisVertical });
  }

  public get canEditAssetProfileIdentifier() {
    return (
      this.assetProfile?.assetClass &&
      !['MANUAL'].includes(this.assetProfile?.dataSource) &&
      this.user?.settings?.isExperimentalFeatures
    );
  }

  public get canSaveAssetProfileIdentifier() {
    return !this.assetProfileForm.dirty;
  }

  public ngOnInit() {
    const { benchmarks, currencies } = this.dataService.fetchInfo();

    this.benchmarks = benchmarks;
    this.currencies = currencies;

    this.initialize();
  }

  public initialize() {
    this.historicalDataItems = undefined;

    this.adminService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ settings }) => {
        this.isDataGatheringEnabled =
          settings[PROPERTY_IS_DATA_GATHERING_ENABLED] === false ? false : true;

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });

    this.assetClassControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((assetClass) => {
        const assetSubClasses = ASSET_CLASS_MAPPING.get(assetClass) ?? [];

        this.assetSubClasses = assetSubClasses.map((assetSubClass) => {
          return {
            id: assetSubClass,
            label: translate(assetSubClass)
          };
        });

        this.assetSubClassControl.setValue(null);

        this.changeDetectorRef.markForCheck();
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
          countries: JSON.stringify(
            this.assetProfile?.countries?.map(({ code, weight }) => {
              return { code, weight };
            }) ?? []
          ),
          currency: this.assetProfile?.currency,
          historicalData: {
            csvString: AssetProfileDialog.HISTORICAL_DATA_TEMPLATE
          },
          isActive: this.assetProfile?.isActive,
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
          url: this.assetProfile?.url ?? ''
        });

        this.assetProfileForm.markAsPristine();

        this.changeDetectorRef.markForCheck();
      });
  }

  public onCancelEditAssetProfileIdentifierMode() {
    this.isEditAssetProfileIdentifierMode = false;

    this.assetProfileForm.enable();

    this.assetProfileIdentifierForm.reset();
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

  public onSetEditAssetProfileIdentifierMode() {
    this.isEditAssetProfileIdentifierMode = true;

    this.assetProfileForm.disable();
  }

  public async onSubmitAssetProfileForm() {
    let countries = [];
    let scraperConfiguration: ScraperConfiguration = {
      selector: '',
      url: ''
    };
    let sectors = [];
    let symbolMapping = {};

    try {
      countries = JSON.parse(this.assetProfileForm.get('countries').value);
    } catch {}

    try {
      scraperConfiguration = {
        defaultMarketPrice:
          (this.assetProfileForm.controls['scraperConfiguration'].controls[
            'defaultMarketPrice'
          ].value as number) || undefined,
        headers: JSON.parse(
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'headers'
          ].value
        ),
        locale:
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'locale'
          ].value || undefined,
        mode: this.assetProfileForm.controls['scraperConfiguration'].controls[
          'mode'
        ].value as ScraperConfiguration['mode'],
        selector:
          this.assetProfileForm.controls['scraperConfiguration'].controls[
            'selector'
          ].value,
        url: this.assetProfileForm.controls['scraperConfiguration'].controls[
          'url'
        ].value
      };

      if (!scraperConfiguration.selector || !scraperConfiguration.url) {
        scraperConfiguration = undefined;
      }
    } catch {}

    try {
      sectors = JSON.parse(this.assetProfileForm.get('sectors').value);
    } catch {}

    try {
      symbolMapping = JSON.parse(
        this.assetProfileForm.get('symbolMapping').value
      );
    } catch {}

    const assetProfile: UpdateAssetProfileDto = {
      countries,
      sectors,
      symbolMapping,
      assetClass: this.assetProfileForm.get('assetClass').value,
      assetSubClass: this.assetProfileForm.get('assetSubClass').value,
      comment: this.assetProfileForm.get('comment').value || null,
      currency: this.assetProfileForm.get('currency').value,
      isActive: this.assetProfileForm.get('isActive').value,
      name: this.assetProfileForm.get('name').value,
      scraperConfiguration:
        scraperConfiguration as unknown as Prisma.InputJsonObject,
      url: this.assetProfileForm.get('url').value || null
    };

    try {
      await validateObjectForForm({
        classDto: UpdateAssetProfileDto,
        form: this.assetProfileForm,
        object: assetProfile
      });
    } catch (error) {
      console.error(error);
      return;
    }

    this.adminService
      .patchAssetProfile(
        {
          dataSource: this.data.dataSource,
          symbol: this.data.symbol
        },
        assetProfile
      )
      .subscribe(() => {
        this.initialize();
      });
  }

  public async onSubmitAssetProfileIdentifierForm() {
    const assetProfileIdentifier: UpdateAssetProfileDto = {
      dataSource: this.assetProfileIdentifierForm.get('assetProfileIdentifier')
        .value.dataSource,
      symbol: this.assetProfileIdentifierForm.get('assetProfileIdentifier')
        .value.symbol
    };

    try {
      await validateObjectForForm({
        classDto: UpdateAssetProfileDto,
        form: this.assetProfileIdentifierForm,
        object: assetProfileIdentifier
      });
    } catch (error) {
      console.error(error);

      return;
    }

    this.adminService
      .patchAssetProfile(
        {
          dataSource: this.data.dataSource,
          symbol: this.data.symbol
        },
        assetProfileIdentifier
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === StatusCodes.CONFLICT) {
            this.snackBar.open(
              $localize`${assetProfileIdentifier.symbol} (${assetProfileIdentifier.dataSource}) is already in use.`,
              undefined,
              {
                duration: ms('3 seconds')
              }
            );
          } else {
            this.snackBar.open(
              $localize`An error occurred while updating to ${assetProfileIdentifier.symbol} (${assetProfileIdentifier.dataSource}).`,
              undefined,
              {
                duration: ms('3 seconds')
              }
            );
          }

          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(() => {
        const newAssetProfileIdentifier = {
          dataSource: assetProfileIdentifier.dataSource,
          symbol: assetProfileIdentifier.symbol
        };

        this.dialogRef.close(newAssetProfileIdentifier);
      });
  }

  public onTestMarketData() {
    this.adminService
      .testMarketData({
        dataSource: this.data.dataSource,
        scraperConfiguration: {
          defaultMarketPrice: this.assetProfileForm.controls[
            'scraperConfiguration'
          ].controls['defaultMarketPrice'].value as number,
          headers: JSON.parse(
            this.assetProfileForm.controls['scraperConfiguration'].controls[
              'headers'
            ].value
          ),
          locale:
            this.assetProfileForm.controls['scraperConfiguration'].controls[
              'locale'
            ].value || undefined,
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
        },
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

  public onToggleIsActive({ checked }: MatCheckboxChange) {
    if (checked) {
      this.assetProfileForm.get('isActive')?.setValue(true);
    } else {
      this.assetProfileForm.get('isActive')?.setValue(false);
    }

    if (checked === this.assetProfile.isActive) {
      this.assetProfileForm.get('isActive')?.markAsPristine();
    } else {
      this.assetProfileForm.get('isActive')?.markAsDirty();
    }
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public onTriggerSubmitAssetProfileForm() {
    if (this.assetProfileForm) {
      this.assetProfileFormElement.nativeElement.requestSubmit();
    }
  }

  private isNewSymbolValid(control: AbstractControl): ValidationErrors {
    const currentAssetProfileIdentifier: AssetProfileIdentifier | undefined =
      control.get('assetProfileIdentifier').value;

    if (
      currentAssetProfileIdentifier?.dataSource === this.data?.dataSource &&
      currentAssetProfileIdentifier?.symbol === this.data?.symbol
    ) {
      return {
        equalsPreviousProfileIdentifier: true
      };
    }
  }
}
