import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  EnhancedSymbolProfile,
  LineChartItem,
  User
} from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Account, Tag } from '@prisma/client';
import { format, isSameMonth, isToday, parseISO } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PositionDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-position-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'position-detail-dialog.html',
  styleUrls: ['./position-detail-dialog.component.scss']
})
export class PositionDetailDialog implements OnDestroy, OnInit {
  public accounts: Account[];
  public activities: Activity[];
  public assetClass: string;
  public assetSubClass: string;
  public averagePrice: number;
  public benchmarkDataItems: LineChartItem[];
  public countries: {
    [code: string]: { name: string; value: number };
  };
  public dataProviderInfo: DataProviderInfo;
  public dataSource: MatTableDataSource<Activity>;
  public dividendInBaseCurrency: number;
  public feeInBaseCurrency: number;
  public firstBuyDate: string;
  public historicalDataItems: LineChartItem[];
  public investment: number;
  public marketPrice: number;
  public maxPrice: number;
  public minPrice: number;
  public netPerformancePercentWithCurrencyEffect: number;
  public netPerformanceWithCurrencyEffect: number;
  public quantity: number;
  public quantityPrecision = 2;
  public reportDataGlitchMail: string;
  public sectors: {
    [name: string]: { name: string; value: number };
  };
  public sortColumn = 'date';
  public sortDirection: SortDirection = 'desc';
  public SymbolProfile: EnhancedSymbolProfile;
  public tags: Tag[];
  public totalItems: number;
  public transactionCount: number;
  public user: User;
  public value: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<PositionDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PositionDetailDialogParams,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.dataService
      .fetchPositionDetail({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          accounts,
          averagePrice,
          dataProviderInfo,
          dividendInBaseCurrency,
          feeInBaseCurrency,
          firstBuyDate,
          historicalData,
          investment,
          marketPrice,
          maxPrice,
          minPrice,
          netPerformancePercentWithCurrencyEffect,
          netPerformanceWithCurrencyEffect,
          orders,
          quantity,
          SymbolProfile,
          tags,
          transactionCount,
          value
        }) => {
          this.accounts = accounts;
          this.activities = orders;
          this.averagePrice = averagePrice;
          this.benchmarkDataItems = [];
          this.countries = {};
          this.dataProviderInfo = dataProviderInfo;
          this.dataSource = new MatTableDataSource(orders.reverse());
          this.dividendInBaseCurrency = dividendInBaseCurrency;
          this.feeInBaseCurrency = feeInBaseCurrency;
          this.firstBuyDate = firstBuyDate;
          this.historicalDataItems = historicalData.map(
            (historicalDataItem) => {
              this.benchmarkDataItems.push({
                date: historicalDataItem.date,
                value: historicalDataItem.averagePrice
              });

              return {
                date: historicalDataItem.date,
                value: historicalDataItem.marketPrice
              };
            }
          );
          this.investment = investment;
          this.marketPrice = marketPrice;
          this.maxPrice = maxPrice;
          this.minPrice = minPrice;
          this.netPerformancePercentWithCurrencyEffect =
            netPerformancePercentWithCurrencyEffect;
          this.netPerformanceWithCurrencyEffect =
            netPerformanceWithCurrencyEffect;
          this.quantity = quantity;
          this.reportDataGlitchMail = `mailto:hi@ghostfol.io?Subject=Ghostfolio Data Glitch Report&body=Hello%0D%0DI would like to report a data glitch for%0D%0DSymbol: ${SymbolProfile?.symbol}%0DData Source: ${SymbolProfile?.dataSource}%0D%0DAdditional notes:%0D%0DCan you please take a look?%0D%0DKind regards`;
          this.sectors = {};
          this.SymbolProfile = SymbolProfile;
          this.tags = tags.map(({ id, name }) => {
            return {
              id,
              name: translate(name)
            };
          });
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

          if (Number.isInteger(this.quantity)) {
            this.quantityPrecision = 0;
          } else if (this.SymbolProfile?.assetSubClass === 'CRYPTOCURRENCY') {
            if (this.quantity < 1) {
              this.quantityPrecision = 7;
            } else if (this.quantity < 1000) {
              this.quantityPrecision = 5;
            } else if (this.quantity > 10000000) {
              this.quantityPrecision = 0;
            }
          }

          this.changeDetectorRef.markForCheck();
        }
      );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onExport() {
    let activityIds = this.dataSource.data.map(({ id }) => {
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
