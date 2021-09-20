import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfDialogFooterModule } from '../../dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '../../dialog-header/dialog-header.module';
import { PositionDetailDialog } from './position-detail-dialog.component';

@NgModule({
  declarations: [PositionDetailDialog],
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
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPositionDetailDialogModule {}
