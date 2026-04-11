import { AdminMarketDataService } from '@ghostfolio/client/components/admin-market-data/admin-market-data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  ASSET_CLASS_MAPPING,
  PROPERTY_IS_DATA_GATHERING_ENABLED
} from '@ghostfolio/common/config';
import { UpdateAssetProfileDto } from '@ghostfolio/common/dtos';
import {
  DATE_FORMAT,
  getCurrencyFromSymbol,
  isCurrency
} from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  AssetClassSelectorOption,
  AssetProfileIdentifier,
  LineChartItem,
  ScraperConfiguration,
  User
} from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { jsonValidator, validateObjectForForm } from '@ghostfolio/common/utils';
import { GfCurrencySelectorComponent } from '@ghostfolio/ui/currency-selector';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { GfHistoricalMarketDataEditorComponent } from '@ghostfolio/ui/historical-market-data-editor';
import { translate } from '@ghostfolio/ui/i18n';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { TextFieldModule } from '@angular/cdk/text-field';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCheckboxChange,
  MatCheckboxModule
} from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { IonIcon } from '@ionic/angular/standalone';
import {
  AssetClass,
  AssetSubClass,
  MarketData,
  Prisma,
  SymbolProfile
} from '@prisma/client';
import { isUUID } from 'class-validator';
import { format } from 'date-fns';
import { StatusCodes } from 'http-status-codes';
import { addIcons } from 'ionicons';
import {
  codeSlashOutline,
  createOutline,
  ellipsisVertical,
  readerOutline,
  serverOutline
} from 'ionicons/icons';
import { isBoolean } from 'lodash';
import ms from 'ms';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AssetProfileDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    FormsModule,
    GfCurrencySelectorComponent,
    GfEntityLogoComponent,
    GfHistoricalMarketDataEditorComponent,
    GfLineChartComponent,
    GfPortfolioProportionChartComponent,
    GfSymbolAutocompleteComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
    ReactiveFormsModule,
    TextFieldModule
  ],
  providers: [AdminMarketDataService],
  selector: 'gf-asset-profile-dialog',
  styleUrls: ['./asset-profile-dialog.component.scss'],
  templateUrl: 'asset-profile-dialog.html'
})
export class GfAssetProfileDialogComponent implements OnInit {
  private static readonly HISTORICAL_DATA_TEMPLATE = `date;marketPrice\n${format(
    new Date(),
    DATE_FORMAT
  )};123.45`;

  @ViewChild('assetProfileFormElement')
  public readonly assetProfileFormElement: ElementRef<HTMLFormElement>;

  protected assetClassLabel: string;
  protected assetSubClassLabel: string;

  protected readonly assetClassOptions: AssetClassSelectorOption[] =
    Object.keys(AssetClass)
      .map((id) => {
        return { id, label: translate(id) } as AssetClassSelectorOption;
      })
      .sort((a, b) => {
        return a.label.localeCompare(b.label);
      });

  protected assetSubClassOptions: AssetClassSelectorOption[] = [];
  protected assetProfile: AdminMarketDataDetails['assetProfile'];

  protected readonly assetProfileForm = this.formBuilder.group({
    assetClass: new FormControl<AssetClass | null>(null),
    assetSubClass: new FormControl<AssetSubClass | null>(null),
    comment: '',
    countries: ['', jsonValidator()],
    currency: '',
    historicalData: this.formBuilder.group({
      csvString: ''
    }),
    isActive: [true],
    name: ['', Validators.required],
    scraperConfiguration: this.formBuilder.group<
      Omit<ScraperConfiguration, 'headers'> & {
        headers: FormControl<string | null>;
      }
    >({
      defaultMarketPrice: undefined,
      headers: new FormControl(JSON.stringify({}), jsonValidator()),
      locale: '',
      mode: 'lazy',
      selector: '',
      url: ''
    }),
    sectors: ['', jsonValidator()],
    symbolMapping: ['', jsonValidator()],
    url: ''
  });

  protected readonly assetProfileIdentifierForm = this.formBuilder.group(
    {
      assetProfileIdentifier: new FormControl<
        AssetProfileIdentifier | { symbol: null; dataSource: null }
      >({ symbol: null, dataSource: null }, [Validators.required])
    },
    {
      validators: (control) => {
        return this.isNewSymbolValid(control);
      }
    }
  );

  protected canEditAssetProfile = true;

  protected countries: {
    [code: string]: { name: string; value: number };
  };

  protected currencies: string[] = [];

  protected readonly dateRangeOptions = [
    {
      label: $localize`Current week` + ' (' + $localize`WTD` + ')',
      value: 'wtd'
    },
    {
      label: $localize`Current month` + ' (' + $localize`MTD` + ')',
      value: 'mtd'
    },
    {
      label: $localize`Current year` + ' (' + $localize`YTD` + ')',
      value: 'ytd'
    },
    {
      label: '1 ' + $localize`year` + ' (' + $localize`1Y` + ')',
      value: '1y'
    },
    {
      label: '5 ' + $localize`years` + ' (' + $localize`5Y` + ')',
      value: '5y'
    },
    {
      label: $localize`Max`,
      value: 'max'
    }
  ];
  protected historicalDataItems: LineChartItem[];
  protected isBenchmark = false;
  protected isDataGatheringEnabled: boolean;
  protected isEditAssetProfileIdentifierMode = false;
  protected readonly isUUID = isUUID;
  protected marketDataItems: MarketData[] = [];

  protected readonly modeValues = [
    {
      value: 'lazy',
      viewValue: $localize`Lazy` + ' (' + $localize`end of day` + ')'
    },
    {
      value: 'instant',
      viewValue: $localize`Instant` + ' (' + $localize`real-time` + ')'
    }
  ];

  protected sectors: {
    [name: string]: { name: string; value: number };
  };

  protected user: User;

  private benchmarks: Partial<SymbolProfile>[];

  public constructor(
    protected adminMarketDataService: AdminMarketDataService,
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) protected data: AssetProfileDialogParams,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private dialogRef: MatDialogRef<GfAssetProfileDialogComponent>,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {
    addIcons({
      codeSlashOutline,
      createOutline,
      ellipsisVertical,
      readerOutline,
      serverOutline
    });
  }

  protected get canSaveAssetProfileIdentifier() {
    return !this.assetProfileForm.dirty && this.canEditAssetProfile;
  }

  public ngOnInit() {
    const { benchmarks, currencies } = this.dataService.fetchInfo();

    this.benchmarks = benchmarks;
    this.currencies = currencies;

    this.initialize();
  }

  protected initialize() {
    this.historicalDataItems = [];

    this.adminService
      .fetchAdminData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ settings }) => {
        this.isDataGatheringEnabled =
          settings[PROPERTY_IS_DATA_GATHERING_ENABLED] === false ? false : true;

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
        }
      });

    this.assetProfileForm.controls.assetClass.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((assetClass) => {
        if (!assetClass) {
          return;
        }

        const assetSubClasses = ASSET_CLASS_MAPPING.get(assetClass) ?? [];

        this.assetSubClassOptions = assetSubClasses
          .map((assetSubClass) => {
            return {
              id: assetSubClass,
              label: translate(assetSubClass)
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));

        this.assetProfileForm.controls.assetSubClass.setValue(null);

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchMarketDataBySymbol({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ assetProfile, marketData }) => {
        this.assetProfile = assetProfile;

        this.assetClassLabel = translate(this.assetProfile?.assetClass ?? '');
        this.assetSubClassLabel = translate(
          this.assetProfile?.assetSubClass ?? ''
        );

        this.canEditAssetProfile = !isCurrency(
          getCurrencyFromSymbol(this.data.symbol)
        );

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

        if (
          this.assetProfile?.countries &&
          this.assetProfile.countries.length > 0
        ) {
          for (const { code, name, weight } of this.assetProfile.countries) {
            this.countries[code] = {
              name,
              value: weight
            };
          }
        }

        if (
          this.assetProfile?.sectors &&
          this.assetProfile.sectors.length > 0
        ) {
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
          currency: this.assetProfile?.currency ?? null,
          historicalData: {
            csvString: GfAssetProfileDialogComponent.HISTORICAL_DATA_TEMPLATE
          },
          isActive: isBoolean(this.assetProfile?.isActive)
            ? this.assetProfile.isActive
            : null,
          name: this.assetProfile.name ?? this.assetProfile.symbol ?? null,
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

        if (!this.canEditAssetProfile) {
          this.assetProfileForm.disable();
        }

        this.assetProfileForm.markAsPristine();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onCancelEditAssetProfileIdentifierMode() {
    this.isEditAssetProfileIdentifierMode = false;

    if (this.canEditAssetProfile) {
      this.assetProfileForm.enable();
    }

    this.assetProfileIdentifierForm.reset();
  }

  protected onClose() {
    this.dialogRef.close();
  }

  protected onDeleteProfileData({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.adminMarketDataService.deleteAssetProfile({ dataSource, symbol });

    this.dialogRef.close();
  }

  protected onGatherProfileDataBySymbol({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.adminService
      .gatherProfileDataBySymbol({ dataSource, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected onGatherSymbol({
    dataSource,
    range,
    symbol
  }: {
    range?: DateRange;
  } & AssetProfileIdentifier) {
    this.adminService
      .gatherSymbol({ dataSource, range, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected onMarketDataChanged(withRefresh: boolean = false) {
    if (withRefresh) {
      this.initialize();
    }
  }

  protected onSetBenchmark({ dataSource, symbol }: AssetProfileIdentifier) {
    this.dataService
      .postBenchmark({ dataSource, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dataService.updateInfo();

        this.isBenchmark = true;

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onSetEditAssetProfileIdentifierMode() {
    this.isEditAssetProfileIdentifierMode = true;

    this.assetProfileForm.disable();
  }

  protected async onSubmitAssetProfileForm() {
    let countries: Prisma.InputJsonArray = [];
    let scraperConfiguration: Prisma.InputJsonObject | undefined = {
      selector: '',
      url: ''
    };
    let sectors: Prisma.InputJsonArray = [];
    let symbolMapping: Record<string, string> = {};

    try {
      countries = JSON.parse(
        this.assetProfileForm.controls.countries.value ?? '[]'
      ) as Prisma.InputJsonArray;
    } catch {}

    try {
      scraperConfiguration = {
        defaultMarketPrice:
          this.assetProfileForm.controls.scraperConfiguration.controls
            .defaultMarketPrice?.value ?? undefined,
        headers: JSON.parse(
          this.assetProfileForm.controls.scraperConfiguration.controls.headers
            .value ?? '{}'
        ) as Record<string, string>,
        locale:
          this.assetProfileForm.controls.scraperConfiguration.controls.locale
            ?.value ?? undefined,
        mode:
          this.assetProfileForm.controls.scraperConfiguration.controls.mode
            ?.value ?? undefined,
        selector:
          this.assetProfileForm.controls.scraperConfiguration.controls.selector
            .value ?? '',
        url:
          this.assetProfileForm.controls.scraperConfiguration.controls.url
            .value ?? ''
      };

      if (!scraperConfiguration.selector || !scraperConfiguration.url) {
        scraperConfiguration = undefined;
      }
    } catch (error) {
      console.error($localize`Could not parse scraper configuration`, error);

      this.snackBar.open(
        '😞 ' + $localize`Could not parse scraper configuration`,
        undefined,
        {
          duration: ms('3 seconds')
        }
      );

      return;
    }

    try {
      sectors = JSON.parse(
        this.assetProfileForm.controls.sectors.value ?? '[]'
      ) as Prisma.InputJsonArray;
    } catch {}

    try {
      symbolMapping = JSON.parse(
        this.assetProfileForm.controls.symbolMapping.value ?? '{}'
      ) as Record<string, string>;
    } catch {}

    const assetProfile: UpdateAssetProfileDto = {
      countries,
      scraperConfiguration,
      sectors,
      symbolMapping,
      assetClass: this.assetProfileForm.controls.assetClass.value ?? undefined,
      assetSubClass:
        this.assetProfileForm.controls.assetSubClass.value ?? undefined,
      comment: this.assetProfileForm.controls.comment.value ?? undefined,
      currency: this.assetProfileForm.controls.currency.value ?? undefined,
      isActive: isBoolean(this.assetProfileForm.controls.isActive.value)
        ? this.assetProfileForm.controls.isActive.value
        : undefined,
      name: this.assetProfileForm.controls.name.value ?? undefined,
      url: this.assetProfileForm.controls.url.value ?? undefined
    };

    try {
      await validateObjectForForm({
        classDto: UpdateAssetProfileDto,
        form: this.assetProfileForm,
        object: assetProfile
      });
    } catch (error) {
      console.error($localize`Could not validate form`, error);

      this.snackBar.open(
        '😞 ' + $localize`Could not validate form`,
        undefined,
        {
          duration: ms('3 seconds')
        }
      );

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
      .subscribe({
        next: () => {
          this.snackBar.open(
            '✅ ' + $localize`Asset profile has been saved`,
            undefined,
            {
              duration: ms('3 seconds')
            }
          );

          this.initialize();
        },
        error: (error: HttpErrorResponse) => {
          console.error($localize`Could not save asset profile`, error);

          this.snackBar.open(
            '😞 ' + $localize`Could not save asset profile`,
            undefined,
            {
              duration: ms('3 seconds')
            }
          );
        }
      });
  }

  protected async onSubmitAssetProfileIdentifierForm() {
    const assetProfileIdentifier: UpdateAssetProfileDto = {
      dataSource:
        this.assetProfileIdentifierForm.controls.assetProfileIdentifier.value
          ?.dataSource ?? undefined,
      symbol:
        this.assetProfileIdentifierForm.controls.assetProfileIdentifier.value
          ?.symbol ?? undefined
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
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const newAssetProfileIdentifier = {
          dataSource: assetProfileIdentifier.dataSource,
          symbol: assetProfileIdentifier.symbol
        };

        this.dialogRef.close(newAssetProfileIdentifier);
      });
  }

  protected onTestMarketData() {
    this.adminService
      .testMarketData({
        dataSource: this.data.dataSource,
        scraperConfiguration: {
          defaultMarketPrice:
            this.assetProfileForm.controls.scraperConfiguration.controls
              .defaultMarketPrice?.value,
          headers: JSON.parse(
            this.assetProfileForm.controls.scraperConfiguration.controls.headers
              .value ?? '{}'
          ) as Record<string, string>,
          locale:
            this.assetProfileForm.controls.scraperConfiguration.controls.locale
              ?.value || undefined,
          mode: this.assetProfileForm.controls.scraperConfiguration.controls
            .mode?.value,
          selector:
            this.assetProfileForm.controls.scraperConfiguration.controls
              .selector.value,
          url: this.assetProfileForm.controls.scraperConfiguration.controls.url
            .value
        },
        symbol: this.data.symbol
      })
      .pipe(
        catchError(({ error }: HttpErrorResponse) => {
          this.notificationService.alert({
            message: error?.message,
            title: $localize`Error`
          });
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ price }) => {
        this.notificationService.alert({
          title:
            $localize`The current market price is` +
            ' ' +
            price +
            ' ' +
            this.assetProfileForm.controls.currency.value
        });
      });
  }

  protected onToggleIsActive({ checked }: MatCheckboxChange) {
    if (checked) {
      this.assetProfileForm.controls.isActive.setValue(true);
    } else {
      this.assetProfileForm.controls.isActive.setValue(false);
    }

    if (checked === this.assetProfile.isActive) {
      this.assetProfileForm.controls.isActive.markAsPristine();
    } else {
      this.assetProfileForm.controls.isActive.markAsDirty();
    }
  }

  protected onUnsetBenchmark({ dataSource, symbol }: AssetProfileIdentifier) {
    this.dataService
      .deleteBenchmark({ dataSource, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dataService.updateInfo();

        this.isBenchmark = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onTriggerSubmitAssetProfileForm() {
    if (this.assetProfileForm.valid) {
      this.onSubmitAssetProfileForm();
    }
  }

  private isNewSymbolValid(control: AbstractControl): ValidationErrors | null {
    const currentAssetProfileIdentifier: AssetProfileIdentifier | undefined =
      control.get('assetProfileIdentifier')?.value;

    if (
      currentAssetProfileIdentifier?.dataSource === this.data?.dataSource &&
      currentAssetProfileIdentifier?.symbol === this.data?.symbol
    ) {
      return {
        equalsPreviousProfileIdentifier: true
      };
    }

    return null;
  }
}
