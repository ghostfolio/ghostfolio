import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '@ghostfolio/client/services/data.service';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { LineChartItem } from '@ghostfolio/ui/line-chart/interfaces/line-chart.interface';
import { AssetSubClass } from '@prisma/client';
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
  public assetSubClass: AssetSubClass;
  public averagePrice: number;
  public benchmarkDataItems: LineChartItem[];
  public currency: string;
  public firstBuyDate: string;
  public grossPerformance: number;
  public grossPerformancePercent: number;
  public historicalDataItems: LineChartItem[];
  public investment: number;
  public marketPrice: number;
  public maxPrice: number;
  public minPrice: number;
  public name: string;
  public netPerformance: number;
  public netPerformancePercent: number;
  public orders: OrderWithAccount[];
  public quantity: number;
  public quantityPrecision = 2;
  public symbol: string;
  public transactionCount: number;
  public value: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<PositionDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PositionDetailDialogParams
  ) {}

  public ngOnInit(): void {
    this.dataService
      .fetchPositionDetail({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          assetSubClass,
          averagePrice,
          currency,
          firstBuyDate,
          grossPerformance,
          grossPerformancePercent,
          historicalData,
          investment,
          marketPrice,
          maxPrice,
          minPrice,
          name,
          netPerformance,
          netPerformancePercent,
          orders,
          quantity,
          symbol,
          transactionCount,
          value
        }) => {
          this.assetSubClass = assetSubClass;
          this.averagePrice = averagePrice;
          this.benchmarkDataItems = [];
          this.currency = currency;
          this.firstBuyDate = firstBuyDate;
          this.grossPerformance = grossPerformance;
          this.grossPerformancePercent = grossPerformancePercent;
          this.historicalDataItems = historicalData.map(
            (historicalDataItem) => {
              this.benchmarkDataItems.push({
                date: historicalDataItem.date,
                value: historicalDataItem.averagePrice
              });

              return {
                date: historicalDataItem.date,
                value: historicalDataItem.value
              };
            }
          );
          this.investment = investment;
          this.marketPrice = marketPrice;
          this.maxPrice = maxPrice;
          this.minPrice = minPrice;
          this.name = name;
          this.netPerformance = netPerformance;
          this.netPerformancePercent = netPerformancePercent;
          this.orders = orders;
          this.quantity = quantity;
          this.symbol = symbol;
          this.transactionCount = transactionCount;
          this.value = value;

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

          if (Number.isInteger(this.quantity)) {
            this.quantityPrecision = 0;
          } else if (assetSubClass === 'CRYPTOCURRENCY') {
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
  }

  public onClose(): void {
    this.dialogRef.close();
  }

  public onExport() {
    this.dataService
      .fetchExport(
        this.orders.map((order) => {
          return order.id;
        })
      )
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        downloadAsFile(
          data,
          `ghostfolio-export-${this.symbol}-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          'text/plain'
        );
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
