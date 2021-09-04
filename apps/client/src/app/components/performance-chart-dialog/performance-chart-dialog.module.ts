import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { GfLineChartModule } from '@ghostfolio/client/components/line-chart/line-chart.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfDialogFooterModule } from '../dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '../dialog-header/dialog-header.module';
import { GfFearAndGreedIndexModule } from '../fear-and-greed-index/fear-and-greed-index.module';
import { PerformanceChartDialog } from './performance-chart-dialog.component';

@NgModule({
  declarations: [PerformanceChartDialog],
  exports: [],
  imports: [
    CommonModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfFearAndGreedIndexModule,
    GfLineChartModule,
    GfValueModule,
    MatButtonModule,
    MatDialogModule,
    NgxSkeletonLoaderModule
  ],
  providers: []
})
export class GfPerformanceChartDialogModule {}
