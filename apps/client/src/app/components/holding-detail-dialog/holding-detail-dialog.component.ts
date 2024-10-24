import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { GfAccountsTableModule } from '@ghostfolio/client/components/accounts-table/accounts-table.module';
import { GfDialogFooterModule } from '@ghostfolio/client/components/dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '@ghostfolio/client/components/dialog-header/dialog-header.module';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { NUMERICAL_PRECISION_THRESHOLD } from '@ghostfolio/common/config';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  EnhancedSymbolProfile,
  Filter,
  LineChartItem,
  User
} from '@ghostfolio/common/interfaces';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDataProviderCreditsComponent } from '@ghostfolio/ui/data-provider-credits';
import { translate } from '@ghostfolio/ui/i18n';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
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
import { Router } from '@angular/router';
import { Account, Tag } from '@prisma/client';
import { format, isSameMonth, isToday, parseISO } from 'date-fns';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Observable, of, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';

import { HoldingDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    CommonModule,
    GfAccountsTableModule,
    GfActivitiesTableComponent,
    GfDataProviderCreditsComponent,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfLineChartComponent,
    GfPortfolioProportionChartComponent,
    GfValueComponent,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatTabsModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-holding-detail-dialog',
  standalone: true,
  styleUrls: ['./holding-detail-dialog.component.scss'],
  templateUrl: 'holding-detail-dialog.html'
})
export class GfHoldingDetailDialogComponent implements OnDestroy, OnInit {
  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;

  public activityForm: FormGroup;
  public accounts: Account[];
  public assetClass: string;
  public assetSubClass: string;
  public averagePrice: number;
  public benchmarkDataItems: LineChartItem[];
  public countries: Record<string, { name: string; value: number }>;
  public dataProviderInfo: DataProviderInfo;
  public dataSource: MatTableDataSource<Activity>;
  public dividendInBaseCurrency: number;
  public dividendInBaseCurrencyPrecision = 2;
  public dividendYieldPercentWithCurrencyEffect: number;
  public feeInBaseCurrency: number;
  public filteredTagsObservable: Observable<Tag[]> = of([]);
  public firstBuyDate: string;
  public historicalDataItems: LineChartItem[];
  public investment: number;
  public investmentPrecision = 2;
  public marketPrice: number;
  public maxPrice: number;
  public minPrice: number;
  public netPerformance: number;
  public netPerformancePrecision = 2;
  public netPerformancePercent: number;
  public netPerformancePercentWithCurrencyEffect: number;
  public netPerformanceWithCurrencyEffect: number;
  public netPerformanceWithCurrencyEffectPrecision = 2;
  public quantity: number;
  public quantityPrecision = 2;
  public reportDataGlitchMail: string;
  public sectors: Record<string, { name: string; value: number }>;
  public separatorKeysCodes: number[] = [COMMA, ENTER];
  public sortColumn = 'date';
  public sortDirection: SortDirection = 'desc';
  public SymbolProfile: EnhancedSymbolProfile;
  public tags: Tag[];
  public tagsAvailable: Tag[];
  public totalItems: number;
  public transactionCount: number;
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
  ) {}

  public ngOnInit() {
    this.activityForm = this.formBuilder.group({
      tags: [] as string[]
    });

    const filters: Filter[] = [
      { id: this.data.dataSource, type: 'DATA_SOURCE' },
      { id: this.data.symbol, type: 'SYMBOL' }
    ];

    this.activityForm
      .get('tags')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((tags) => {
        this.dataService
          .putHoldingTags({
            tags,
            dataSource: this.data.dataSource,
            symbol: this.data.symbol
          })
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe();
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
          averagePrice,
          dataProviderInfo,
          dividendInBaseCurrency,
          dividendYieldPercentWithCurrencyEffect,
          feeInBaseCurrency,
          firstBuyDate,
          historicalData,
          investment,
          marketPrice,
          maxPrice,
          minPrice,
          netPerformance,
          netPerformancePercent,
          netPerformancePercentWithCurrencyEffect,
          netPerformanceWithCurrencyEffect,
          quantity,
          SymbolProfile,
          tags,
          transactionCount,
          value
        }) => {
          this.averagePrice = averagePrice;
          this.benchmarkDataItems = [];
          this.countries = {};
          this.dataProviderInfo = dataProviderInfo;
          this.dividendInBaseCurrency = dividendInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.dividendInBaseCurrency >= NUMERICAL_PRECISION_THRESHOLD
          ) {
            this.dividendInBaseCurrencyPrecision = 0;
          }

          this.dividendYieldPercentWithCurrencyEffect =
            dividendYieldPercentWithCurrencyEffect;

          this.feeInBaseCurrency = feeInBaseCurrency;
          this.firstBuyDate = firstBuyDate;

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

          this.investment = investment;

          if (
            this.data.deviceType === 'mobile' &&
            this.investment >= NUMERICAL_PRECISION_THRESHOLD
          ) {
            this.investmentPrecision = 0;
          }

          this.marketPrice = marketPrice;
          this.maxPrice = maxPrice;
          this.minPrice = minPrice;
          this.netPerformance = netPerformance;

          if (
            this.data.deviceType === 'mobile' &&
            this.netPerformance >= NUMERICAL_PRECISION_THRESHOLD
          ) {
            this.netPerformancePrecision = 0;
          }

          this.netPerformancePercent = netPerformancePercent;

          this.netPerformancePercentWithCurrencyEffect =
            netPerformancePercentWithCurrencyEffect;

          this.netPerformanceWithCurrencyEffect =
            netPerformanceWithCurrencyEffect;

          if (
            this.data.deviceType === 'mobile' &&
            this.netPerformanceWithCurrencyEffect >=
              NUMERICAL_PRECISION_THRESHOLD
          ) {
            this.netPerformanceWithCurrencyEffectPrecision = 0;
          }

          this.quantity = quantity;

          if (Number.isInteger(this.quantity)) {
            this.quantityPrecision = 0;
          } else if (this.SymbolProfile?.assetSubClass === 'CRYPTOCURRENCY') {
            if (this.quantity < 1) {
              this.quantityPrecision = 7;
            } else if (this.quantity < 1000) {
              this.quantityPrecision = 5;
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

          this.activityForm.setValue({ tags: this.tags }, { emitEvent: false });

          this.filteredTagsObservable = this.activityForm.controls[
            'tags'
          ].valueChanges.pipe(
            startWith(this.activityForm.get('tags').value),
            map((aTags: Tag[] | null) => {
              return aTags
                ? this.filterTags(aTags)
                : this.tagsAvailable.slice();
            })
          );

          this.transactionCount = transactionCount;
          this.totalItems = transactionCount;
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

          if (isToday(parseISO(this.firstBuyDate))) {
            // Add average price
            this.historicalDataItems.push({
              date: this.firstBuyDate,
              value: this.averagePrice
            });

            // Add benchmark 1
            this.benchmarkDataItems.push({
              date: this.firstBuyDate,
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
            isSameMonth(parseISO(this.firstBuyDate), new Date())
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

          this.changeDetectorRef.markForCheck();
        }
      );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

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

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    this.activityForm.get('tags').setValue([
      ...(this.activityForm.get('tags').value ?? []),
      this.tagsAvailable.find(({ id }) => {
        return id === event.option.value;
      })
    ]);

    this.tagInput.nativeElement.value = '';
  }

  public onCloneActivity(aActivity: Activity) {
    this.router.navigate(['/portfolio', 'activities'], {
      queryParams: { activityId: aActivity.id, createDialog: true }
    });

    this.dialogRef.close();
  }

  public onClose() {
    this.dialogRef.close();
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

  public onRemoveTag(aTag: Tag) {
    this.activityForm.get('tags').setValue(
      this.activityForm.get('tags').value.filter(({ id }) => {
        return id !== aTag.id;
      })
    );
  }

  public onUpdateActivity(aActivity: Activity) {
    this.router.navigate(['/portfolio', 'activities'], {
      queryParams: { activityId: aActivity.id, editDialog: true }
    });

    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private filterTags(aTags: Tag[]) {
    const tagIds = aTags.map(({ id }) => {
      return id;
    });

    return this.tagsAvailable.filter(({ id }) => {
      return !tagIds.includes(id);
    });
  }
}
