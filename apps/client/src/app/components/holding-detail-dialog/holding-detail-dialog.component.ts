import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_PAGE_SIZE,
  NUMERICAL_PRECISION_THRESHOLD_3_FIGURES,
  NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
} from '@ghostfolio/common/config';
import { CreateOrderDto } from '@ghostfolio/common/dtos';
import {
  DATE_FORMAT,
  downloadAsFile,
  getCountryName
} from '@ghostfolio/common/helper';
import {
  Activity,
  DataProviderInfo,
  EnhancedSymbolProfile,
  Filter,
  LineChartItem,
  NullableLineChartItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfAccountsTableComponent } from '@ghostfolio/ui/accounts-table';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDataProviderCreditsComponent } from '@ghostfolio/ui/data-provider-credits';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { GfHistoricalMarketDataEditorComponent } from '@ghostfolio/ui/historical-market-data-editor';
import { translate } from '@ghostfolio/ui/i18n';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';
import { DataService } from '@ghostfolio/ui/services';
import { GfTagsSelectorComponent } from '@ghostfolio/ui/tags-selector';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PageEvent } from '@angular/material/paginator';
import { SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Account, MarketData, Tag } from '@prisma/client';
import { isUUID } from 'class-validator';
import { format, isSameMonth, isToday, parseISO } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  arrowDownCircleOutline,
  createOutline,
  flagOutline,
  readerOutline,
  serverOutline,
  swapVerticalOutline,
  walletOutline
} from 'ionicons/icons';
import { isNumber } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { switchMap } from 'rxjs/operators';

import { HoldingDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    GfAccountsTableComponent,
    GfActivitiesTableComponent,
    GfDataProviderCreditsComponent,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfHistoricalMarketDataEditorComponent,
    GfLineChartComponent,
    GfPortfolioProportionChartComponent,
    GfTagsSelectorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatTabsModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-holding-detail-dialog',
  styleUrls: ['./holding-detail-dialog.component.scss'],
  templateUrl: 'holding-detail-dialog.html'
})
export class GfHoldingDetailDialogComponent implements OnInit {
  protected accounts: Account[];
  protected activitiesCount: number;
  protected assetClass: string;
  protected assetSubClass: string;
  protected averagePrice: number;
  protected averagePricePrecision = 2;
  protected benchmarkDataItems: NullableLineChartItem[];
  protected readonly benchmarkLabel = $localize`Average Unit Price`;
  protected countries: {
    [code: string]: { name: string; value: number };
  };
  protected dataProviderInfo: DataProviderInfo;
  protected dataSource: MatTableDataSource<Activity>;
  protected dateOfFirstActivity: Date;
  protected dividendInBaseCurrency: number;
  protected dividendInBaseCurrencyPrecision = 2;
  protected dividendYieldPercentWithCurrencyEffect: number;
  protected feeInBaseCurrency: number;
  protected readonly getCountryName = getCountryName;
  protected hasPermissionToCreateOwnTag: boolean;
  protected hasPermissionToReadMarketDataOfOwnAssetProfile: boolean;
  protected historicalDataItems: LineChartItem[];
  protected holdingForm: FormGroup<{
    tags: FormControl<Tag[] | null>;
  }>;
  protected investmentInBaseCurrencyWithCurrencyEffect: number;
  protected investmentInBaseCurrencyWithCurrencyEffectPrecision = 2;
  protected readonly isUUID = isUUID;
  protected marketDataItems: MarketData[] = [];
  protected marketPrice: number;
  protected marketPriceMax: number;
  protected marketPriceMaxPrecision = 2;
  protected marketPriceMin: number;
  protected marketPriceMinPrecision = 2;
  protected marketPricePrecision = 2;
  protected netPerformancePercentWithCurrencyEffect: number;
  protected netPerformancePercentWithCurrencyEffectPrecision = 2;
  protected netPerformanceWithCurrencyEffect: number;
  protected netPerformanceWithCurrencyEffectPrecision = 2;
  protected pageIndex = 0;
  protected readonly pageSize = DEFAULT_PAGE_SIZE;
  protected quantity: number;
  protected quantityPrecision = 2;
  protected reportDataGlitchMail: string;
  protected readonly routerLinkAdminControlMarketData =
    internalRoutes.adminControl.subRoutes.marketData.routerLink;
  protected sectors: {
    [name: string]: { name: string; value: number };
  };
  protected sortColumn = 'date';
  protected sortDirection: SortDirection = 'desc';
  protected SymbolProfile: EnhancedSymbolProfile;
  protected tagsAvailable: Tag[];
  protected readonly translate = translate;
  protected user: User;
  protected value: number;

  protected readonly data = inject<HoldingDetailDialogParams>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(
    MatDialogRef<GfHoldingDetailDialogComponent>
  );

  private tags: Tag[];

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    addIcons({
      arrowDownCircleOutline,
      createOutline,
      flagOutline,
      readerOutline,
      serverOutline,
      swapVerticalOutline,
      walletOutline
    });
  }

  public ngOnInit() {
    const filters = this.getActivityFilters();

    this.holdingForm = this.formBuilder.group({
      tags: new FormControl<Tag[]>([])
    });

    this.holdingForm.controls.tags.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tags: Tag[]) => {
        const newTag = tags.find(({ id }) => {
          return id === undefined;
        });

        if (newTag && this.hasPermissionToCreateOwnTag) {
          this.dataService
            .postTag({ ...newTag, userId: this.user.id })
            .pipe(
              switchMap((createdTag) => {
                return this.dataService.putHoldingTags({
                  dataSource: this.data.dataSource,
                  symbol: this.data.symbol,
                  tags: [
                    ...tags.filter(({ id }) => {
                      return id !== undefined;
                    }),
                    createdTag
                  ]
                });
              }),
              switchMap(() => {
                return this.userService.get(true);
              }),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
        } else {
          this.dataService
            .putHoldingTags({
              tags,
              dataSource: this.data.dataSource,
              symbol: this.data.symbol
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        }
      });

    this.dataService
      .fetchAccounts({
        filters
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accounts }) => {
        this.accounts = accounts;

        this.changeDetectorRef.markForCheck();
      });

    this.fetchActivities(filters);

    this.dataService
      .fetchHoldingDetail({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ({
          activitiesCount,
          averagePrice,
          dataProviderInfo,
          dateOfFirstActivity,
          dividendInBaseCurrency,
          dividendYieldPercentWithCurrencyEffect,
          feeInBaseCurrency,
          historicalData,
          investmentInBaseCurrencyWithCurrencyEffect,
          marketPrice,
          marketPriceMax,
          marketPriceMin,
          netPerformancePercentWithCurrencyEffect,
          netPerformanceWithCurrencyEffect,
          quantity,
          SymbolProfile,
          tags,
          value
        }) => {
          this.activitiesCount = activitiesCount;
          this.averagePrice = averagePrice;

          if (
            this.averagePrice >= NUMERICAL_PRECISION_THRESHOLD_5_FIGURES &&
            this.data.deviceType === 'mobile'
          ) {
            this.averagePricePrecision = 0;
          }

          this.benchmarkDataItems = [];
          this.countries = {};
          this.dataProviderInfo = dataProviderInfo;

          if (dateOfFirstActivity) {
            this.dateOfFirstActivity = dateOfFirstActivity;
          }

          this.dividendInBaseCurrency = dividendInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.dividendInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
          ) {
            this.dividendInBaseCurrencyPrecision = 0;
          }

          this.dividendYieldPercentWithCurrencyEffect =
            dividendYieldPercentWithCurrencyEffect;

          this.feeInBaseCurrency = feeInBaseCurrency;

          this.hasPermissionToReadMarketDataOfOwnAssetProfile =
            hasPermission(
              this.user?.permissions,
              permissions.readMarketDataOfOwnAssetProfile
            ) &&
            SymbolProfile?.dataSource === 'MANUAL' &&
            SymbolProfile?.userId === this.user?.id;

          this.historicalDataItems = historicalData.map(
            ({ averagePrice, date, marketPrice }) => {
              this.benchmarkDataItems.push({
                date,
                value: isNumber(averagePrice) ? averagePrice : null
              });

              return {
                date,
                value: marketPrice ?? 0
              };
            }
          );

          this.investmentInBaseCurrencyWithCurrencyEffect =
            investmentInBaseCurrencyWithCurrencyEffect;

          if (
            this.data.deviceType === 'mobile' &&
            this.investmentInBaseCurrencyWithCurrencyEffect >=
              NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
          ) {
            this.investmentInBaseCurrencyWithCurrencyEffectPrecision = 0;
          }

          this.marketPrice = marketPrice;
          this.marketPriceMax = marketPriceMax;

          if (
            this.data.deviceType === 'mobile' &&
            this.marketPriceMax >= NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
          ) {
            this.marketPriceMaxPrecision = 0;
          }

          this.marketPriceMin = marketPriceMin;

          if (
            this.data.deviceType === 'mobile' &&
            this.marketPriceMin >= NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
          ) {
            this.marketPriceMinPrecision = 0;
          }

          if (
            this.data.deviceType === 'mobile' &&
            this.marketPrice >= NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
          ) {
            this.marketPricePrecision = 0;
          }

          this.netPerformancePercentWithCurrencyEffect =
            netPerformancePercentWithCurrencyEffect;

          if (
            this.data.deviceType === 'mobile' &&
            this.netPerformancePercentWithCurrencyEffect >=
              NUMERICAL_PRECISION_THRESHOLD_3_FIGURES
          ) {
            this.netPerformancePercentWithCurrencyEffectPrecision = 0;
          }

          this.netPerformanceWithCurrencyEffect =
            netPerformanceWithCurrencyEffect;

          if (
            this.data.deviceType === 'mobile' &&
            this.netPerformanceWithCurrencyEffect >=
              NUMERICAL_PRECISION_THRESHOLD_5_FIGURES
          ) {
            this.netPerformanceWithCurrencyEffectPrecision = 0;
          }

          this.quantity = quantity;

          if (Number.isInteger(this.quantity)) {
            this.quantityPrecision = 0;
          } else if (SymbolProfile?.assetSubClass === 'CRYPTOCURRENCY') {
            if (this.quantity < 10) {
              this.quantityPrecision = 8;
            } else if (this.quantity < 1000) {
              this.quantityPrecision = 6;
            } else if (this.quantity >= 10000000) {
              this.quantityPrecision = 0;
            }
          }

          this.reportDataGlitchMail = `mailto:hi@ghostfol.io?Subject=Ghostfolio Data Glitch Report&body=Hello%0D%0DI would like to report a data glitch for%0D%0DSymbol: ${SymbolProfile?.symbol}%0DData Source: ${SymbolProfile?.dataSource}%0D%0DAdditional notes:%0D%0DCan you please take a look?%0D%0DKind regards`;
          this.sectors = {};
          this.SymbolProfile = SymbolProfile;

          this.tags = tags.map((tag) => {
            return {
              ...tag,
              name: translate(tag.name)
            };
          });

          this.holdingForm.setValue({ tags: this.tags }, { emitEvent: false });

          this.value = value;

          if (SymbolProfile?.assetClass) {
            this.assetClass = translate(SymbolProfile?.assetClass);
          }

          if (SymbolProfile?.assetSubClass) {
            this.assetSubClass = translate(SymbolProfile?.assetSubClass);
          }

          if (SymbolProfile?.countries?.length > 0) {
            for (const country of SymbolProfile.countries) {
              this.countries[country.code] = {
                name: getCountryName({
                  code: country.code,
                  locale: this.data.locale
                }),
                value: country.weight
              };
            }
          }

          if (SymbolProfile?.sectors?.length > 0) {
            for (const sector of SymbolProfile.sectors) {
              this.sectors[sector.name] = {
                name: translate(sector.name),
                value: sector.weight
              };
            }
          }

          if (isToday(this.dateOfFirstActivity)) {
            // Add average price
            this.historicalDataItems.push({
              date: this.dateOfFirstActivity.toISOString(),
              value: this.averagePrice
            });

            // Add benchmark 1
            this.benchmarkDataItems.push({
              date: this.dateOfFirstActivity.toISOString(),
              value: averagePrice
            });

            // Add market price
            this.historicalDataItems.push({
              date: new Date().toISOString(),
              value: this.marketPrice
            });

            // Add benchmark 2
            this.benchmarkDataItems.push({
              date: new Date().toISOString(),
              value: averagePrice
            });
          } else {
            // Add market price
            this.historicalDataItems.push({
              date: format(new Date(), DATE_FORMAT),
              value: this.marketPrice
            });

            // Add benchmark
            this.benchmarkDataItems.push({
              date: format(new Date(), DATE_FORMAT),
              value: averagePrice
            });
          }

          if (
            this.benchmarkDataItems[0]?.value === undefined &&
            isSameMonth(this.dateOfFirstActivity, new Date())
          ) {
            this.benchmarkDataItems[0].value = this.averagePrice;
          }

          this.benchmarkDataItems = this.benchmarkDataItems.map(
            ({ date, value }) => {
              return {
                date,
                value: value === 0 ? null : value
              };
            }
          );

          if (this.hasPermissionToReadMarketDataOfOwnAssetProfile) {
            this.fetchMarketData();
          }

          this.changeDetectorRef.markForCheck();
        }
      );

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateOwnTag =
            hasPermission(this.user.permissions, permissions.createOwnTag) &&
            (this.user?.settings?.isExperimentalFeatures ?? false);

          this.tagsAvailable =
            this.user?.tags?.map((tag) => {
              return {
                ...tag,
                name: translate(tag.name)
              };
            }) ?? [];

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  protected onChangePage(page: PageEvent) {
    this.pageIndex = page.pageIndex;

    this.fetchActivities();
  }

  protected onCloneActivity(aActivity: Activity) {
    this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink,
      {
        queryParams: { activityId: aActivity.id, createDialog: true }
      }
    );

    this.dialogRef.close();
  }

  protected onClose() {
    this.dialogRef.close();
  }

  protected onCloseHolding() {
    const today = new Date();

    const activity: CreateOrderDto = {
      accountId: this.accounts.length === 1 ? this.accounts[0].id : undefined,
      comment: undefined,
      currency: this.SymbolProfile?.currency ?? '',
      dataSource: this.SymbolProfile?.dataSource,
      date: today.toISOString(),
      fee: 0,
      quantity: this.quantity,
      symbol: this.SymbolProfile?.symbol ?? '',
      tags: this.tags.map(({ id }) => {
        return id;
      }),
      type: 'SELL',
      unitPrice: this.marketPrice
    };

    this.dataService
      .postActivity(activity)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.router.navigate(
          internalRoutes.portfolio.subRoutes.activities.routerLink
        );

        this.dialogRef.close();
      });
  }

  protected onExport() {
    const activityIds = this.dataSource.data.map(({ id }) => {
      return id;
    });

    this.dataService
      .fetchExport({ activityIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${this.SymbolProfile?.symbol}-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  protected onMarketDataChanged(withRefresh = false) {
    if (withRefresh) {
      this.fetchMarketData();
    }
  }

  protected onUpdateActivity(aActivity: Activity) {
    this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink,
      {
        queryParams: { activityId: aActivity.id, editDialog: true }
      }
    );

    this.dialogRef.close();
  }

  private fetchActivities(filters: Filter[] = this.getActivityFilters()) {
    this.dataService
      .fetchActivities({
        filters,
        skip: this.pageIndex * this.pageSize,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        take: this.pageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ activities }) => {
        this.dataSource = new MatTableDataSource(activities);

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchMarketData() {
    this.dataService
      .fetchMarketDataBySymbol({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ marketData }) => {
        this.marketDataItems = marketData;

        this.historicalDataItems = this.marketDataItems.map(
          ({ date, marketPrice }) => {
            return {
              date: format(date, DATE_FORMAT),
              value: marketPrice
            };
          }
        );

        this.changeDetectorRef.markForCheck();
      });
  }

  private getActivityFilters(): Filter[] {
    return [
      { id: this.data.dataSource, type: 'DATA_SOURCE' },
      { id: this.data.symbol, type: 'SYMBOL' }
    ];
  }
}
