import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfTrendIndicatorComponent } from '@ghostfolio/ui/trend-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfPositionDetailDialogModule } from './position-detail-dialog/position-detail-dialog.module';
import { PositionComponent } from './position.component';

@NgModule({
  declarations: [PositionComponent],
  exports: [PositionComponent],
  imports: [
    CommonModule,
    GfPositionDetailDialogModule,
    GfSymbolModule,
    GfTrendIndicatorComponent,
    GfValueComponent,
    MatDialogModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPositionModule {}
