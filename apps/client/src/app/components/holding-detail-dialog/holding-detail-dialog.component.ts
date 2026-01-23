import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  NUMERICAL_PRECISION_THRESHOLD_3_FIGURES,
  NUMERICAL_PRECISION_THRESHOLD_5_FIGURES,
  NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
} from '@ghostfolio/common/config';
import { CreateOrderDto } from '@ghostfolio/common/dtos';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import {
  Activity,
  DataProviderInfo,
  EnhancedSymbolProfile,
  Filter,
  LineChartItem,
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

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
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
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

import { HoldingDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    CommonModule,
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
export class GfHoldingDetailDialogComponent implements OnDestroy, OnInit {
  public activitiesCount: number;
  public accounts: Account[];
  public assetClass: string;
  public assetSubClass: string;
  public averagePrice: number;
  public averagePricePrecision = 2;
  public benchmarkDataItems: LineChartItem[];
  public benchmarkLabel = $localize`Average Unit Price`;
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public dataProviderInfo: DataProviderInfo;
  public dataSource: MatTableDataSource<Activity>;
  public dateOfFirstActivity: string;
  public dividendInBaseCurrency: number;
  public dividendInBaseCurrencyPrecision = 2;
  public dividendYieldPercentWithCurrencyEffect: number;
  public feeInBaseCurrency: number;
  public hasPermissionToCreateOwnTag: boolean;
  public hasPermissionToReadMarketDataOfOwnAssetProfile: boolean;
  public historicalDataItems: LineChartItem[];
  public holdingForm: FormGroup;
  public investmentInBaseCurrencyWithCurrencyEffect: number;
  public investmentInBaseCurrencyWithCurrencyEffectPrecision = 2;
  public isUUID = isUUID;
  public marketDataItems: MarketData[] = [];
  public marketPrice: number;
  public marketPriceMax: number;
  public marketPriceMaxPrecision = 2;
  public marketPriceMin: number;
  public marketPriceMinPrecision = 2;
  public marketPricePrecision = 2;
  public netPerformance: number;
  public netPerformancePrecision = 2;
  public netPerformancePercent: number;
  public netPerformancePercentWithCurrencyEffect: number;
  public netPerformancePercentWithCurrencyEffectPrecision = 2;
  public netPerformanceWithCurrencyEffect: number;
  public netPerformanceWithCurrencyEffectPrecision = 2;
  public quantity: number;
  public quantityPrecision = 2;
  public reportDataGlitchMail: string;
  public routerLinkAdminControlMarketData =
    internalRoutes.adminControl.subRoutes.marketData.routerLink;
  public sectors: {
    [name: string]: { name: string; value: number };
  };
  public sortColumn = 'date';
  public sortDirection: SortDirection = 'desc';
  public SymbolProfile: EnhancedSymbolProfile;
  public tags: Tag[];
  public tagsAvailable: Tag[];
  public user: User;
  public value: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfHoldingDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HoldingDetailDialogParams,
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {
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
    const filters: Filter[] = [
      { id: this.data.dataSource, type: 'DATA_SOURCE' },
      { id: this.data.symbol, type: 'SYMBOL' }
    ];

    this.holdingForm = this.formBuilder.group({
      tags: [] as string[]
    });

    this.holdingForm
      .get('tags')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
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
              takeUntil(this.unsubscribeSubject)
            )
            .subscribe();
        } else {
          this.dataService
            .putHoldingTags({
              tags,
              dataSource: this.data.dataSource,
              symbol: this.data.symbol
            })
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe();
        }
      });

    this.dataService
      .fetchAccounts({
        filters
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ accounts }) => {
        this.accounts = accounts;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchActivities({
        filters,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.dataSource = new MatTableDataSource(activities);

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchHoldingDetail({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
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
          netPerformance,
          netPerformancePercent,
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
            this.averagePrice >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES &&
            this.data.deviceType === 'mobile'
          ) {
            this.averagePricePrecision = 0;
          }

          this.benchmarkDataItems = [];
          this.countries = {};
          this.dataProviderInfo = dataProviderInfo;
          this.dateOfFirstActivity = dateOfFirstActivity;
          this.dividendInBaseCurrency = dividendInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.dividendInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
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
                value: averagePrice
              });

              return {
                date,
                value: marketPrice
              };
            }
          );

          this.investmentInBaseCurrencyWithCurrencyEffect =
            investmentInBaseCurrencyWithCurrencyEffect;

          if (
            this.data.deviceType === 'mobile' &&
            this.investmentInBaseCurrencyWithCurrencyEffect >=
              NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.investmentInBaseCurrencyWithCurrencyEffectPrecision = 0;
          }

          this.marketPrice = marketPrice;
          this.marketPriceMax = marketPriceMax;

          if (
            this.data.deviceType === 'mobile' &&
            this.marketPriceMax >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.marketPriceMaxPrecision = 0;
          }

          this.marketPriceMin = marketPriceMin;

          if (
            this.data.deviceType === 'mobile' &&
            this.marketPriceMin >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.marketPriceMinPrecision = 0;
          }

          if (
            this.data.deviceType === 'mobile' &&
            this.marketPrice >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.marketPricePrecision = 0;
          }

          this.netPerformance = netPerformance;

          if (
            this.data.deviceType === 'mobile' &&
            this.netPerformance >= NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
          ) {
            this.netPerformancePrecision = 0;
          }

          this.netPerformancePercent = netPerformancePercent;

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
                name: country.name,
                value: country.weight
              };
            }
          }

          if (SymbolProfile?.sectors?.length > 0) {
            for (const sector of SymbolProfile.sectors) {
              this.sectors[sector.name] = {
                name: sector.name,
                value: sector.weight
              };
            }
          }

          if (isToday(parseISO(this.dateOfFirstActivity))) {
            // Add average price
            this.historicalDataItems.push({
              date: this.dateOfFirstActivity,
              value: this.averagePrice
            });

            // Add benchmark 1
            this.benchmarkDataItems.push({
              date: this.dateOfFirstActivity,
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
            isSameMonth(parseISO(this.dateOfFirstActivity), new Date())
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
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateOwnTag =
            hasPermission(this.user.permissions, permissions.createOwnTag) &&
            this.user?.settings?.isExperimentalFeatures;

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

  public onCloneActivity(aActivity: Activity) {
    this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink,
      {
        queryParams: { activityId: aActivity.id, createDialog: true }
      }
    );

    this.dialogRef.close();
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onCloseHolding() {
    const today = new Date();

    const activity: CreateOrderDto = {
      accountId: this.accounts.length === 1 ? this.accounts[0].id : null,
      comment: null,
      currency: this.SymbolProfile.currency,
      dataSource: this.SymbolProfile.dataSource,
      date: today.toISOString(),
      fee: 0,
      quantity: this.quantity,
      symbol: this.SymbolProfile.symbol,
      tags: this.tags.map(({ id }) => {
        return id;
      }),
      type: 'SELL',
      unitPrice: this.marketPrice
    };

    this.dataService
      .postOrder(activity)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.router.navigate(
          internalRoutes.portfolio.subRoutes.activities.routerLink
        );

        this.dialogRef.close();
      });
  }

  public onExport() {
    const activityIds = this.dataSource.data.map(({ id }) => {
      return id;
    });

    this.dataService
      .fetchExport({ activityIds })
      .pipe(takeUntil(this.unsubscribeSubject))
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

  public onMarketDataChanged(withRefresh = false) {
    if (withRefresh) {
      this.fetchMarketData();
    }
  }

  public onUpdateActivity(aActivity: Activity) {
    this.router.navigate(
      internalRoutes.portfolio.subRoutes.activities.routerLink,
      {
        queryParams: { activityId: aActivity.id, editDialog: true }
      }
    );

    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchMarketData() {
    this.dataService
      .fetchMarketDataBySymbol({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
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
}
