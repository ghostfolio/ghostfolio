import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { GfDialogFooterModule } from '@ghostfolio/client/components/dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '@ghostfolio/client/components/dialog-header/dialog-header.module';
import { GfTransactionsTableModule } from '@ghostfolio/client/components/transactions-table/transactions-table.module';
import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PositionDetailDialog } from './position-detail-dialog.component';

@NgModule({
  declarations: [PositionDetailDialog],
  exports: [],
  imports: [
    CommonModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfLineChartModule,
    GfTransactionsTableModule,
    GfValueModule,
    MatButtonModule,
    MatDialogModule,
    NgxSkeletonLoaderModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPositionDetailDialogModule {}
