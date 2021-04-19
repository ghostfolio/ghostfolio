import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfSymbolIconModule } from '../symbol-icon/symbol-icon.module';
import { GfTrendIndicatorModule } from '../trend-indicator/trend-indicator.module';
import { GfValueModule } from '../value/value.module';
import { GfPositionDetailDialogModule } from './position-detail-dialog/position-detail-dialog.module';
import { PositionComponent } from './position.component';

@NgModule({
  declarations: [PositionComponent],
  exports: [PositionComponent],
  imports: [
    CommonModule,
    GfPositionDetailDialogModule,
    GfSymbolIconModule,
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
