import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  LineChartItem
} from '@ghostfolio/common/interfaces';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { DataService } from '@ghostfolio/ui/services';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { format } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { GfLineChartComponent } from '../../line-chart/line-chart.component';
import { GfValueComponent } from '../../value/value.component';
import { BenchmarkDetailDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfLineChartComponent,
    GfValueComponent,
    MatDialogModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-benchmark-detail-dialog',
  styleUrls: ['./benchmark-detail-dialog.component.scss'],
  templateUrl: 'benchmark-detail-dialog.html'
})
export class GfBenchmarkDetailDialogComponent implements OnDestroy, OnInit {
  public assetProfile: AdminMarketDataDetails['assetProfile'];
  public historicalDataItems: LineChartItem[];
  public value: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfBenchmarkDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BenchmarkDetailDialogParams
  ) {}

  public ngOnInit() {
    this.dataService
      .fetchAsset({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ assetProfile, marketData }) => {
        this.assetProfile = assetProfile;

        this.historicalDataItems = marketData.map(
          ({ date, marketPrice }, index) => {
            if (marketData.length - 1 === index) {
              this.value = marketPrice;
            }

            return {
              date: format(date, DATE_FORMAT),
              value: marketPrice
            };
          }
        );

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClose() {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
