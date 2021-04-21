import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { GfLineChartModule } from '@ghostfolio/client/components/line-chart/line-chart.module';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfDialogFooterModule } from '../../dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '../../dialog-header/dialog-header.module';
import { GfValueModule } from '../../value/value.module';
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
