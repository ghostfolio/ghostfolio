import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { format, isSameMonth, isToday, parseISO } from 'date-fns';

import { DataService } from '../../../services/data.service';
import { LineChartItem } from '../../line-chart/interfaces/line-chart.interface';
import { PositionDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column h-100' },
  selector: 'position-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'position-detail-dialog.html',
  styleUrls: ['./position-detail-dialog.component.scss']
})
export class PositionDetailDialog {
  public averagePrice: number;
  public benchmarkDataItems: LineChartItem[];
  public currency: string;
  public firstBuyDate: string;
  public grossPerformancePercent: number;
  public historicalDataItems: LineChartItem[];
  public investment: number;
  public marketPrice: number;
  public maxPrice: number;
  public minPrice: number;
  public quantity: number;

  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<PositionDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PositionDetailDialogParams
  ) {
    this.dataService
      .fetchPositionDetail(data.symbol)
      .subscribe(
        ({
          averagePrice,
          currency,
          firstBuyDate,
          grossPerformancePercent,
          historicalData,
          investment,
          marketPrice,
          maxPrice,
          minPrice,
          quantity
        }) => {
          this.averagePrice = averagePrice;
          this.benchmarkDataItems = [];
          this.currency = currency;
          this.firstBuyDate = firstBuyDate;
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
              date: format(new Date(), 'yyyy-MM-dd'),
              value: this.marketPrice
            });

            // Add benchmark
            this.benchmarkDataItems.push({
              date: format(new Date(), 'yyyy-MM-dd'),
              value: averagePrice
            });
          }

          if (
            this.benchmarkDataItems[0]?.value === undefined &&
            isSameMonth(parseISO(this.firstBuyDate), new Date())
          ) {
            this.benchmarkDataItems[0].value = this.averagePrice;
          }

          this.cd.markForCheck();
        }
      );
  }

  public onClose(): void {
    this.dialogRef.close();
  }
}
