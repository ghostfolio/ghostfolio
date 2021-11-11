import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfDialogFooterModule } from '../dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '../dialog-header/dialog-header.module';
import { PerformanceChartDialog } from './performance-chart-dialog.component';

@NgModule({
  declarations: [PerformanceChartDialog],
  exports: [],
  imports: [
    CommonModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfLineChartModule,
    GfValueModule,
    MatButtonModule,
    MatDialogModule,
    NgxSkeletonLoaderModule
  ],
  providers: []
})
export class GfPerformanceChartDialogModule {}
