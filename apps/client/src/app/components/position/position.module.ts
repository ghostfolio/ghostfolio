import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfTrendIndicatorModule } from '../trend-indicator/trend-indicator.module';
import { GfPositionDetailDialogModule } from './position-detail-dialog/position-detail-dialog.module';
import { PositionComponent } from './position.component';

@NgModule({
  declarations: [PositionComponent],
  exports: [PositionComponent],
  imports: [
    CommonModule,
    GfPositionDetailDialogModule,
    GfSymbolModule,
    GfTrendIndicatorModule,
    GfValueModule,
    MatDialogModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPositionModule {}
