import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '@ghostfolio/client/services/data.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { format, isSameMonth, isToday, parseISO } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LineChartItem } from '../../line-chart/interfaces/line-chart.interface';
import { PositionDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'gf-position-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'position-detail-dialog.html',
  styleUrls: ['./position-detail-dialog.component.scss']
})
export class PositionDetailDialog implements OnDestroy {
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
  public quantity: number;
  public transactionCount: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<PositionDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PositionDetailDialogParams
  ) {
    this.dataService
      .fetchPositionDetail(data.symbol)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
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
          quantity,
          transactionCount
        }) => {
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
          this.quantity = quantity;
          this.transactionCount = transactionCount;

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

          this.changeDetectorRef.markForCheck();
        }
      );
  }

  public onClose(): void {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
